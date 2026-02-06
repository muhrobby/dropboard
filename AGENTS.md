# AGENTS.md - Coding Guidelines for Dropboard

## Project Overview

Next.js 16 React application with TypeScript and Tailwind CSS v4.

## Build Commands

```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Build
npm run build        # Production build
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint (eslint-config-next)
```

## Package Manager

Use **pnpm** (pnpm-lock.yaml present).

```bash
pnpm install         # Install dependencies
pnpm add <pkg>       # Add dependency
pnpm add -D <pkg>    # Add dev dependency
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.x
- **Language**: TypeScript 5 (strict mode enabled)
- **Styling**: Tailwind CSS v4 with PostCSS
- **Font**: Geist (sans + mono) via next/font
- **Linting**: ESLint 9 with eslint-config-next

## Project Structure

```
app/                 # Next.js App Router
├── page.tsx         # Home page
├── layout.tsx       # Root layout
├── globals.css      # Global styles
└── favicon.ico
public/              # Static assets
.next/               # Build output (ignored)
```

## Code Style Guidelines

### TypeScript

- Enable strict mode (already configured)
- Use explicit types for function parameters and returns
- Prefer `type` over `interface` for object shapes
- Use `React.ReactNode` for children props

### Imports

- Use `@/*` path alias for project imports (configured in tsconfig)
- Group imports: React/Next, third-party, local
- Use named imports where possible

```typescript
import Image from "next/image";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/app/globals.css";
```

### Component Structure

- Use functional components with default exports for pages
- Props interface with descriptive names:

```typescript
export default function ComponentName({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

### Tailwind CSS v4

- Uses `@import "tailwindcss"` in globals.css
- Custom theme variables in `@theme inline` block
- Dark mode via `prefers-color-scheme` media query
- Use `dark:` prefix for dark mode styles

### Naming Conventions

- Components: PascalCase (e.g., `MyComponent.tsx`)
- Files: camelCase for utilities, PascalCase for components
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE

### Error Handling

- Use try/catch for async operations
- Prefer early returns over nested conditionals
- Use TypeScript's strict null checks

### Git

- Do not commit: `.env*`, `node_modules`, `.next/`, `out/`, `build/`
- Follow conventional commits (recommended)

## Testing

No test framework configured yet. To add tests:
- Vitest or Jest for unit tests
- Playwright for E2E tests

## Environment

- Node.js: Use LTS version
- Port: 3000 (default)
- Environment variables: Use `.env.local` (ignored by git)

## Important Notes

- Uses Next.js App Router (not Pages Router)
- Tailwind v4 uses new CSS-first configuration
- No explicit test command available currently
- Font optimization handled by `next/font`
