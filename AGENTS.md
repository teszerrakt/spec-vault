# spec-vault Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-23

## Active Technologies

- TypeScript 5.x + Next.js 16 (full-stack framework), NextAuth.js v5 (authentication), XState (wizard state management), Vercel AI SDK (multi-provider AI), shadcn/ui (components), Tailwind CSS (styling) (001-api-contract-platform)

## Project Structure

```text
src/
tests/
```

## Commands

pnpm test && pnpm run lint

## Code Style

TypeScript 5.x: Follow standard conventions

## Recent Changes

- 001-api-contract-platform: Added TypeScript 5.x + Next.js 16 (full-stack framework), NextAuth.js v5 (authentication), XState (wizard state management), Vercel AI SDK (multi-provider AI), shadcn/ui (components), Tailwind CSS (styling)

<!-- MANUAL ADDITIONS START -->

## Development Principles

1. **DRY (Don't Repeat Yourself)**: Extract common logic into reusable functions, hooks, and components. Avoid code duplication.

2. **KISS (Keep It Simple, Stupid)**: Prefer simple, readable solutions over clever abstractions. Only add complexity when necessary.

3. **Use CLI Tools Over Manual Code**: When official CLI tools are available, use them instead of writing code directly:
   - `pnpm create next-app@latest` - Initialize Next.js projects
   - `pnpm dlx shadcn@latest init` - Initialize shadcn/ui
   - `pnpm dlx shadcn@latest add <component>` - Add shadcn/ui components
   - `pnpm dlx auth secret` - Generate NextAuth.js secret
   - `pnpm create xstate` - Initialize XState machines

<!-- MANUAL ADDITIONS END -->
