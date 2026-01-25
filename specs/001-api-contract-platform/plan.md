# Implementation Plan: Centralized API Contract Platform

**Branch**: `001-api-contract-platform` | **Date**: 2026-01-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-api-contract-platform/spec.md`

## Summary

Build a GitHub-first API contract management platform that enables teams to convert various API descriptions (JSON, CSV, Excel, images, text) into OpenAPI 3.0+ specifications using AI assistance, edit/validate specs through a guided wizard workflow, store contracts as YAML files in GitHub repositories, create pull requests for review (redirecting to GitHub), and auto-generate changelogs from contract diffs. Authentication uses GitHub OAuth App flow. Contracts are uniquely identified by file path within the repository.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js 16 (full-stack framework), NextAuth.js v5 (authentication), XState (wizard state management), Vercel AI SDK (multi-provider AI), shadcn/ui (components), Tailwind CSS (styling)  
**Storage**: GitHub repositories (primary), Local filesystem (dev mode) - no traditional database  
**Testing**: Vitest (unit), Playwright (E2E), @apidevtools/swagger-parser (OpenAPI validation)  
**Target Platform**: Web application (modern browsers: Chrome, Firefox, Safari, Edge - latest 2 versions)  
**Project Type**: Web application (Next.js 16 monolith with App Router)  
**Performance Goals**: <5s contract list load, <10s save operations, <3s PR redirect, support 50 concurrent users  
**Constraints**: GitHub API rate limits, AI service latency for imports, file size limits (JSON/CSV 10MB, Excel 25MB, Images 10MB)  
**Scale/Scope**: 100+ contracts per repository, 50 concurrent team members

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution file contains template placeholders and has not been configured for this project. Proceeding without constitution constraints.

**Status**: PASS (no constitution rules defined)

## Project Structure

### Documentation (this feature)

```text
specs/001-api-contract-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

*Note: No API contracts directory - using Server Actions instead of REST API*

### Source Code (repository root)

```text
src/
├── app/                     # Next.js 16 App Router
│   ├── (auth)/              # Auth routes (login, callback)
│   ├── (dashboard)/         # Protected routes
│   │   ├── contracts/       # Contract list, view, edit
│   │   ├── import/          # Import wizard
│   │   └── settings/        # Repository configuration
│   ├── api/                 # Route Handlers (minimal)
│   │   └── auth/[...nextauth]/ # NextAuth.js route handler only
│   └── layout.tsx
├── actions/                 # Server Actions
│   ├── contracts.ts         # Contract CRUD (list, get, save, delete)
│   ├── import.ts            # AI-powered import/conversion
│   ├── github.ts            # GitHub operations (PR, history)
│   └── validation.ts        # OpenAPI validation
├── auth.ts                  # NextAuth.js configuration
├── auth.config.ts           # Auth config (edge-compatible)
├── middleware.ts            # NextAuth.js middleware for route protection
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── contracts/           # Contract-specific components
│   ├── editor/              # OpenAPI editor components
│   └── wizard/              # Import wizard components
├── lib/
│   ├── repository/          # ContractRepository pattern
│   │   ├── types.ts         # ContractRepository interface
│   │   ├── github.ts        # GitHub implementation (Octokit)
│   │   └── local.ts         # Local filesystem implementation (dev)
│   ├── openapi/             # OpenAPI parsing/validation
│   ├── ai/                  # AI service integration
│   ├── changelog/           # Diff and changelog generation
│   └── utils/               # Shared utilities
├── machines/                # XState state machines
│   ├── import-wizard.ts     # Import flow state machine
│   └── editor-wizard.ts     # Editor flow state machine
├── types/                   # TypeScript type definitions
│   ├── next-auth.d.ts       # NextAuth.js type extensions
│   └── index.ts
└── hooks/                   # Custom React hooks

tests/
├── unit/                    # Vitest unit tests
├── integration/             # Server Actions integration tests
└── e2e/                     # Playwright E2E tests
```

**Structure Decision**: Next.js 16 monolith using **Server Actions** instead of REST API endpoints. Server Actions provide type-safe RPC-style calls directly from client components. ContractRepository pattern abstracts GitHub (via Octokit) and Local filesystem behind a common interface. NextAuth.js v5 handles GitHub OAuth with native App Router support. No external API to document.

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
