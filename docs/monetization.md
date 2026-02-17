# Monetization

## Pricing Tiers

AgentLink monetizes platform and connectivity value, not compute/tokens.

### Free Tier
- 2 agent connections
- 10 active chat sessions per agent
- 7 days on-device conversation history
- No cross-device sync
- No file uploads
- No tunnel relay
- Default theme only
- Community support

### Pro ($9.99/month)
- Unlimited agent connections
- Unlimited chat sessions
- Unlimited on-device history
- Cross-device encrypted sync
- File uploads (25MB/file)
- 1 tunnel relay connection
- Full theme engine
- All plugins
- Agent config import/export
- Conversation export (JSON, Markdown)
- Priority push notifications
- Email support (48hr)

### Team ($24.99/user/month)
- Everything in Pro
- File uploads (100MB/file)
- Unlimited tunnel relay connections
- Shared agent pools (team-managed agents)
- Admin dashboard (usage, access controls)
- SSO/SAML
- Branded themes
- Custom plugins
- Priority support (4hr)

## Stripe Integration

### Products & Prices Setup

```typescript
// Create in Stripe Dashboard or via API:
// Product: "AgentLink Pro"
//   Price: $9.99/month, recurring
//   Price ID → STRIPE_PRO_PRICE_ID env var

// Product: "AgentLink Team"
//   Price: $24.99/month per seat, recurring
//   Price ID → STRIPE_TEAM_PRICE_ID env var
```

### Checkout Flow

```typescript
// src/lib/billing/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  returnUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,  // from Clerk
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnUrl}?canceled=true`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  });
  return session;
}

export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}
```

### Webhook Handler

```typescript
// src/app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0].price.id;
      const plan = priceId === process.env.STRIPE_PRO_PRICE_ID ? 'pro' : 'team';

      await supabase.from('users').update({
        plan,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq('id', userId);
      break;
    }
    case 'customer.subscription.updated': {
      // Sync plan changes (upgrade/downgrade)
      break;
    }
    case 'customer.subscription.deleted': {
      // Downgrade to free
      const sub = event.data.object;
      await supabase.from('users').update({ plan: 'free' })
        .eq('stripe_subscription_id', sub.id);
      break;
    }
  }
  return new Response('OK');
}
```

## Feature Gates

```typescript
// src/lib/billing/feature-gates.ts

import type { UserPlan } from '@/types';

export const PLAN_LIMITS = {
  free: {
    maxAgents: 2,
    maxSessionsPerAgent: 10,
    historyDays: 7,
    crossDeviceSync: false,
    fileUpload: false,
    maxFileSizeMb: 0,
    tunnelConnections: 0,
    customThemes: false,
    configExport: false,
  },
  pro: {
    maxAgents: Infinity,
    maxSessionsPerAgent: Infinity,
    historyDays: Infinity,
    crossDeviceSync: true,
    fileUpload: true,
    maxFileSizeMb: 25,
    tunnelConnections: 1,
    customThemes: true,
    configExport: true,
  },
  team: {
    maxAgents: Infinity,
    maxSessionsPerAgent: Infinity,
    historyDays: Infinity,
    crossDeviceSync: true,
    fileUpload: true,
    maxFileSizeMb: 100,
    tunnelConnections: Infinity,
    customThemes: true,
    configExport: true,
  },
} as const;

export function canAddAgent(plan: UserPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxAgents;
}

export function canSyncCrossDevice(plan: UserPlan): boolean {
  return PLAN_LIMITS[plan].crossDeviceSync;
}

export function canUploadFiles(plan: UserPlan): boolean {
  return PLAN_LIMITS[plan].fileUpload;
}

export function getMaxFileSize(plan: UserPlan): number {
  return PLAN_LIMITS[plan].maxFileSizeMb * 1024 * 1024; // bytes
}

export function canUseTunnel(plan: UserPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].tunnelConnections;
}
```

### Upgrade Prompt UI Pattern

When a user hits a feature gate:
1. Show an inline `<UpgradePrompt>` component explaining what they're trying to do
2. "Upgrade to Pro" CTA button → opens Stripe Checkout
3. After successful checkout → refresh plan → unlock feature immediately

```typescript
// Example usage in add-agent flow:
const agentCount = useAgentStore(s => s.agents.size);
const plan = useUserPlan();

if (!canAddAgent(plan, agentCount)) {
  return <UpgradePrompt
    feature="unlimited agents"
    current={`You have ${agentCount} of ${PLAN_LIMITS[plan].maxAgents} agents`}
    targetPlan="pro"
  />;
}
```

## Mobile Payment Considerations

- **Apple App Store**: 30% commission (15% for <$1M revenue). Consider web-only subscription purchase. App can unlock Pro features via account login without in-app purchase.
- **Google Play**: 15% for first $1M. More favorable. Consider offering both in-app and web purchase.
- **Stripe web**: 2.9% + $0.30. Most favorable margin. Push users to web checkout.

## Revenue Projections (Conservative)

| MAU | Free (80%) | Pro (15%) | Team (5%) | MRR |
|---|---|---|---|---|
| 1,000 | 800 | 150 | 50 | $2,744 |
| 5,000 | 4,000 | 750 | 250 | $13,743 |
| 10,000 | 8,000 | 1,500 | 500 | $27,470 |
| 50,000 | 40,000 | 7,500 | 2,500 | $137,350 |

Formula: (Pro users × $9.99) + (Team users × $24.99)
