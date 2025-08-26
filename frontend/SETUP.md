# Frontend Setup Guide

## Quick Setup

Due to React 19 compatibility issues with some dependencies, use the following commands:

```bash
# Install dependencies with legacy peer deps
npm run setup

# Start development server
npm run dev

# Build for production
npm run build

# Type check only
npm run type-check
```

## Project Structure Created

```
frontend/
├── src/
│   ├── components/ui/          # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── lib/
│   │   └── utils.ts           # Utility functions
│   ├── types/
│   │   └── index.ts           # TypeScript definitions
│   ├── hooks/                 # Custom React hooks
│   ├── pages/                 # Page components
│   ├── context/               # React context providers
│   └── assets/                # Static assets
├── .env.sample                # Environment variables template
├── tailwind.config.js         # TailwindCSS configuration
├── postcss.config.js          # PostCSS configuration
├── components.json            # shadcn/ui configuration
└── vite.config.ts             # Vite configuration with path aliases
```

## Configuration Highlights

- **React 19** with TypeScript
- **TailwindCSS** with dark mode and custom design tokens
- **Path aliases** configured (`@/` points to `src/`)
- **shadcn/ui** components with glassmorphism styling
- **Environment variables** for API and WebSocket configuration
- **Dark mode** enabled by default

## Next Steps

1. Install dependencies: `npm run setup`
2. Copy `.env.sample` to `.env` and configure
3. Start development: `npm run dev`
4. Begin implementing the application shell and components

The project is ready for development with all the required dependencies and configurations in place.
