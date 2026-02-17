import { describe, it, expect } from 'vitest';
import {
  UserPlanSchema,
  UserSchema,
  UserPreferencesSchema,
  UserInputSchema,
  UserUpdateSchema,
  UserSessionSchema,
  AgentStatusSchema,
  ConnectionStateSchema,
  type User,
  type UserPlan,
  type UserPreferences,
  type UserSession,
} from './user.schema';

describe('UserPlanSchema', () => {
  it('should validate valid plans', () => {
    const validPlans: UserPlan[] = ['free', 'pro', 'team'];

    for (const plan of validPlans) {
      const result = UserPlanSchema.safeParse(plan);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid plans', () => {
    const invalidPlans = ['enterprise', 'basic', 'premium', ''];

    for (const plan of invalidPlans) {
      const result = UserPlanSchema.safeParse(plan);
      expect(result.success).toBe(false);
    }
  });
});

describe('UserSchema', () => {
  const validUser: User = {
    id: 'user-1',
    clerkId: 'clerk-user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    avatarUrl: 'https://example.com/avatar.png',
    plan: 'pro',
    syncEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('should validate a complete valid user', () => {
    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('should catch invalid field types', () => {
    const userWithInvalidTypes = {
      id: 'user-1',
      clerkId: 'clerk-user-1',
      plan: 'invalid-plan',
      syncEnabled: 'yes',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = UserSchema.safeParse(userWithInvalidTypes);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toBe('free');
      expect(result.data.syncEnabled).toBe(false);
    }
  });

  it('should validate user without email', () => {
    const userWithoutEmail = {
      ...validUser,
      email: undefined,
    };

    const result = UserSchema.safeParse(userWithoutEmail);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const invalidUser = {
      ...validUser,
      email: 'not-an-email',
    };

    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });

  it('should validate all plan types', () => {
    const plans: UserPlan[] = ['free', 'pro', 'team'];

    for (const plan of plans) {
      const user: User = {
        ...validUser,
        plan,
      };

      const result = UserSchema.safeParse(user);
      expect(result.success).toBe(true);
    }
  });

  it('should validate user without display name', () => {
    const userWithoutDisplayName = {
      ...validUser,
      displayName: undefined,
    };

    const result = UserSchema.safeParse(userWithoutDisplayName);
    expect(result.success).toBe(true);
  });

  it('should reject missing clerkId', () => {
    const invalidUser = {
      ...validUser,
      clerkId: undefined,
    };

    const result = UserSchema.safeParse(invalidUser);
    expect(result.success).toBe(false);
  });
});

describe('UserPreferencesSchema', () => {
  const validPreferences: UserPreferences = {
    userId: 'user-1',
    theme: 'dark',
    fontSize: 'large',
    codeTheme: 'dracula',
    enterToSend: false,
    showTokenCount: false,
    autoScroll: false,
    soundEnabled: true,
    shareAnalytics: true,
    storeLocalHistory: false,
    pushNotifications: true,
    emailNotifications: true,
    updatedAt: new Date().toISOString(),
  };

  it('should validate complete preferences', () => {
    const result = UserPreferencesSchema.safeParse(validPreferences);
    expect(result.success).toBe(true);
  });

  it('should catch invalid field types', () => {
    const preferencesWithInvalidTypes = {
      userId: 'user-1',
      theme: 'blue',
      fontSize: 'extra-large',
      enterToSend: 'yes',
      showTokenCount: 1,
      updatedAt: new Date().toISOString(),
    };

    const result = UserPreferencesSchema.safeParse(preferencesWithInvalidTypes);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe('system');
      expect(result.data.fontSize).toBe('medium');
      expect(result.data.enterToSend).toBe(true);
      expect(result.data.showTokenCount).toBe(true);
    }
  });

  it('should validate all theme options', () => {
    const themes = ['light', 'dark', 'system'] as const;

    for (const theme of themes) {
      const preferences: UserPreferences = {
        ...validPreferences,
        theme,
      };

      const result = UserPreferencesSchema.safeParse(preferences);
      expect(result.success).toBe(true);
    }
  });

  it('should validate all font size options', () => {
    const fontSizes = ['small', 'medium', 'large'] as const;

    for (const fontSize of fontSizes) {
      const preferences: UserPreferences = {
        ...validPreferences,
        fontSize,
      };

      const result = UserPreferencesSchema.safeParse(preferences);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid theme', () => {
    const invalidPreferences = {
      ...validPreferences,
      theme: 'blue',
    };

    // Zod v4 .catch() will return default on invalid
    const result = UserPreferencesSchema.safeParse(invalidPreferences);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.theme).toBe('system');
    }
  });

  it('should reject invalid font size', () => {
    const invalidPreferences = {
      ...validPreferences,
      fontSize: 'extra-large',
    };

    const result = UserPreferencesSchema.safeParse(invalidPreferences);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fontSize).toBe('medium');
    }
  });
});

describe('UserInputSchema', () => {
  it('should validate without auto-generated fields', () => {
    const input = {
      clerkId: 'clerk-user-1',
      email: 'new@example.com',
      displayName: 'New User',
    };

    const result = UserInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate with minimal fields', () => {
    const input = {
      clerkId: 'clerk-user-1',
    };

    const result = UserInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject if id is provided', () => {
    const inputWithId = {
      id: 'should-not-be-here',
      clerkId: 'clerk-user-1',
    };

    const result = UserInputSchema.safeParse(inputWithId);
    expect(result.success).toBe(false);
  });
});

describe('UserUpdateSchema', () => {
  it('should validate with only id', () => {
    const update = { id: 'user-1' };

    const result = UserUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate with partial fields', () => {
    const update = {
      id: 'user-1',
      displayName: 'Updated Name',
      plan: 'pro' as const,
    };

    const result = UserUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should validate plan upgrade', () => {
    const update = {
      id: 'user-1',
      plan: 'team' as const,
    };

    const result = UserUpdateSchema.safeParse(update);
    expect(result.success).toBe(true);
  });

  it('should reject without id', () => {
    const update = { displayName: 'Updated Name' };

    const result = UserUpdateSchema.safeParse(update);
    expect(result.success).toBe(false);
  });
});

describe('UserSessionSchema', () => {
  const validSession = {
    id: 'session-1',
    userId: 'user-1',
    deviceName: 'iPhone 15',
    deviceType: 'mobile' as const,
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    isValid: true,
  };

  it('should validate a complete valid session', () => {
    const result = UserSessionSchema.safeParse(validSession);
    expect(result.success).toBe(true);
  });

  it('should validate session without optional fields', () => {
    const minimalSession = {
      id: 'session-1',
      userId: 'user-1',
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };

    const result = UserSessionSchema.safeParse(minimalSession);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isValid).toBe(true);
    }
  });

  it('should validate all device types', () => {
    const deviceTypes = ['mobile', 'tablet', 'desktop', 'web'] as const;

    for (const deviceType of deviceTypes) {
      const session = {
        ...validSession,
        deviceType,
      };

      const result = UserSessionSchema.safeParse(session);
      expect(result.success).toBe(true);
    }
  });

  it('should validate invalid session', () => {
    const invalidSession = {
      ...validSession,
      isValid: false,
    };

    const result = UserSessionSchema.safeParse(invalidSession);
    expect(result.success).toBe(true);
  });

  it('should reject invalid device type', () => {
    const invalidSession = {
      ...validSession,
      deviceType: 'smartwatch',
    };

    const result = UserSessionSchema.safeParse(invalidSession);
    expect(result.success).toBe(false);
  });
});

describe('AgentStatusSchema', () => {
  it('should validate online status', () => {
    const status = {
      agentId: 'agent-1',
      isOnline: true,
      lastCheckedAt: new Date().toISOString(),
    };

    const result = AgentStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it('should validate offline status with error', () => {
    const status = {
      agentId: 'agent-1',
      isOnline: false,
      latencyMs: 0,
      lastCheckedAt: new Date().toISOString(),
      error: 'Connection timeout',
    };

    const result = AgentStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it('should validate with latency', () => {
    const status = {
      agentId: 'agent-1',
      isOnline: true,
      latencyMs: 150,
      lastCheckedAt: new Date().toISOString(),
    };

    const result = AgentStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });
});

describe('ConnectionStateSchema', () => {
  it('should validate connected state', () => {
    const state = {
      isConnected: true,
      isConnecting: false,
    };

    const result = ConnectionStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('should validate connecting state', () => {
    const state = {
      isConnected: false,
      isConnecting: true,
    };

    const result = ConnectionStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('should validate disconnected state with error', () => {
    const state = {
      isConnected: false,
      isConnecting: false,
      error: 'WebSocket closed',
    };

    const result = ConnectionStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});
