# AgentLink

Mobile-first chat client for self-hosted LLM agents.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🤖 **Multi-Agent Support** - Connect to OpenAI-compatible, Ollama, and Anthropic agents
- 📱 **Mobile-First UI** - Beautiful, responsive design optimized for mobile devices
- 💾 **Offline Support** - Message queue for offline use with automatic sync
- 🔒 **End-to-End Encryption** - Secure credential storage with encryption
- 🎨 **Dark/Light Themes** - Adaptive theming with system preference support
- ⚡ **PWA Ready** - Install as a native app on mobile and desktop
- 🔄 **Real-time Streaming** - Live message streaming with reasoning support
- 📊 **Health Monitoring** - Automatic agent health checks with latency tracking

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd agentlink

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the values:

```env
# Optional: Encryption key for credential storage
# If not provided, a device-specific key will be generated
AGENTLINK_ENCRYPTION_KEY=your-secure-key-here
```

## Development

```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Run TypeScript type checking
npm run type-check

# Run tests
npm test

# Lint code
npm run lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # Main app routes (with layout)
│   │   ├── agents/        # Agent management pages
│   │   ├── search/        # Search functionality
│   │   └── settings/      # App settings
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Root redirect page
├── components/
│   ├── agents/            # Agent-related components
│   ├── chat/              # Chat UI components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── agents/            # Agent adapters (OpenAI, Ollama, etc.)
│   ├── chat/              # Chat engine and utilities
│   └── db/                # IndexedDB operations
├── stores/                # Zustand state stores
└── types/                 # TypeScript types and schemas
```

## Supported Agent Types

### Ollama
Connect to locally running Ollama instances.
- Endpoint: `http://localhost:11434`
- Supports all Ollama models

### OpenAI-Compatible
Connect to any OpenAI-compatible API endpoint.
- OpenAI: `https://api.openai.com/v1`
- OpenClaw: Your self-hosted instance
- vLLM: Self-hosted vLLM server
- LM Studio: Local LM Studio server

### Anthropic (Claude)
Connect to Anthropic's Claude API.
- Endpoint: `https://api.anthropic.com/v1`

## Architecture

### State Management
- **Zustand** for global state
- **IndexedDB** via Dexie for persistent storage
- **Optimistic updates** for responsive UI

### Chat Engine
- Streaming message support
- Message queue for offline use
- Automatic retry with exponential backoff
- Token estimation and context management

### Security
- AES-GCM encryption for API keys
- Device-specific key derivation
- No server-side credential storage

## Browser Support

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+
- Mobile Safari (iOS 15+)
- Chrome Android

## PWA Installation

### iOS
1. Open AgentLink in Safari
2. Tap the share button
3. Select "Add to Home Screen"

### Android
1. Open AgentLink in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home screen"

### Desktop
1. Open AgentLink in Chrome/Edge
2. Click the install icon in the address bar
3. Follow the prompts

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Animations powered by [Framer Motion](https://www.framer.com/motion/)
