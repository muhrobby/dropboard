# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ringkasan Proyek

Dropboard adalah aplikasi Next.js 16 dengan React 19, TypeScript, dan Tailwind CSS v4. Project ini menggunakan App Router (bukan Pages Router).

## Package Manager

Gunakan **pnpm** (file `pnpm-lock.yaml` ada di root).

```bash
pnpm install         # Install dependencies
pnpm add <paket>     # Add dependency
pnpm add -D <paket>  # Add dev dependency
```

**PENTING:** Jangan instal dependency yang asal-asal dan berbahaya. Selalu verifikasi keamanan dan reputasi package sebelum menginstal.

## Perintah Development

```bash
pnpm dev             # Start dev server di localhost:3000
pnpm build           # Production build
pnpm start           # Start production server
pnpm lint            # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.3
- **TypeScript**: 5 (strict mode enabled)
- **Styling**: Tailwind CSS v4 dengan PostCSS
- **Font**: Geist (sans + mono) via `next/font/google`
- **Linting**: ESLint 9 dengan `eslint-config-next`

## Struktur Proyek

```
app/                    # Next.js App Router
├── layout.tsx         # Root layout dengan font configuration
├── page.tsx           # Home page
├── globals.css        # Global styles + Tailwind v4 config
└── favicon.ico
public/                 # Static assets
```

## Path Aliases

`@/*` diresolve ke root project (dikonfigurasi di `tsconfig.json`). Gunakan untuk imports internal:

```typescript
import "@/app/globals.css";
```

## Konfigurasi Penting

### Tailwind CSS v4
- Menggunakan CSS-first configuration (bukan `tailwind.config.js`)
- Import via `@import "tailwindcss"` di `globals.css`
- Custom theme variables di block `@theme inline`
- Dark mode via `prefers-color-scheme` media query
- Gunakan prefix `dark:` untuk dark mode styles

### TypeScript
- Strict mode enabled
- Target: ES2017
- JSX: react-jsx

### ESLint
- Menggunakan `eslint-config-next` dengan core-web-vitals dan typescript rules
- Konfigurasi di `eslint.config.mjs` (format baru ESLint 9)

## Konvensi Kode

### Imports
```typescript
// React/Next imports dulu
import Image from "next/image";
import type { Metadata } from "next";

// Third-party
import { Geist } from "next/font/google";

// Local imports dengan path alias
import "@/app/globals.css";
```

### Components
- Gunakan functional components
- Props dengan inline type annotation:
```typescript
export default function ComponentName({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

### Naming
- Components: PascalCase
- Files: camelCase untuk utilities, PascalCase untuk components
- Variables/functions: camelCase

## Environment Variables

Gunakan `.env.local` untuk environment variables (file ini di-ignore oleh git).

## Font

Geist font di-load di root layout dengan CSS variables:
- `--font-geist-sans`: Sans-serif font
- `--font-geist-mono`: Monospace font
