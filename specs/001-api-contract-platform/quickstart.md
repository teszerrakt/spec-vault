# Quickstart: API Contract Platform

**Feature**: 001-api-contract-platform  
**Date**: 2026-01-25

## Prerequisites

- **Node.js**: v20.x or later (required for Next.js 16)
- **pnpm**: v8.x or later (recommended) or npm v10+
- **Git**: v2.30+
- **GitHub Account**: For OAuth and repository access

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd spec-vault

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

```env
# GitHub OAuth App
# Create at: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# NextAuth.js Secret (generate with: pnpm dlx auth secret)
AUTH_SECRET=your_auth_secret

# GitHub Repository Configuration (REQUIRED)
GITHUB_OWNER=your-org-or-username
GITHUB_REPO=api-contracts

# AI Provider (Vercel AI SDK)
OPENAI_API_KEY=sk-...
```

### 3. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Configure:
   - **Application name**: Spec Vault (Dev)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env.local`

### 4. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                     # Next.js 16 App Router
│   ├── (auth)/              # Public auth routes
│   │   └── login/           # Login page
│   ├── (dashboard)/         # Protected routes (require auth)
│   │   ├── contracts/       # Contract list, view
│   │   ├── edit/            # Contract editor
│   │   ├── import/          # Import wizard
│   │   └── settings/        # Repository configuration
│   └── api/                 # Route Handlers (minimal)
│       └── auth/[...nextauth]/ # NextAuth.js only
├── actions/                 # Server Actions
│   ├── contracts.ts         # Contract CRUD
│   ├── import.ts            # AI conversion
│   ├── github.ts            # GitHub operations
│   └── validation.ts        # OpenAPI validation
├── auth.ts                  # NextAuth.js config
├── auth.config.ts           # Edge-compatible auth config
├── middleware.ts            # Route protection
├── components/              # React components
│   ├── contracts/           # Contract-related components
│   ├── editor/              # Editor section components
│   ├── settings/            # Settings components
│   ├── ui/                  # shadcn/ui components
│   └── wizard/              # Import wizard components
├── hooks/                   # Custom React hooks
├── lib/
│   ├── ai/                  # AI conversion (Vercel AI SDK)
│   ├── changelog/           # Changelog generation
│   ├── import/              # File processors (CSV, JSON, etc.)
│   ├── openapi/             # OpenAPI parser/validator
│   └── repository/          # ContractRepository pattern
│       ├── types.ts         # Interface
│       ├── github.ts        # GitHub (Octokit)
│       ├── local.ts         # Local filesystem
│       └── index.ts         # Factory
├── machines/                # XState state machines
└── types/                   # TypeScript definitions
```

## Key Commands

```bash
# Development
pnpm dev                # Start dev server with Turbopack
pnpm build              # Production build
pnpm start              # Start production server

# Testing
pnpm test               # Run Vitest unit tests
pnpm test:e2e           # Run Playwright E2E tests

# Code Quality
pnpm lint               # ESLint
pnpm tsc --noEmit       # TypeScript check
pnpm format             # Prettier
```

## Authentication Flow

The platform uses NextAuth.js v5 with GitHub OAuth:

```typescript
// Using session in Server Components
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  
  // session.accessToken available for GitHub API calls
}

// Using session in Client Components
"use client";
import { useSession } from "next-auth/react";

export function Component() {
  const { data: session, status } = useSession();
  // ...
}
```

## Server Actions (No REST API)

All data operations use Server Actions with the ContractRepository pattern:

```typescript
// actions/contracts.ts
"use server";

import { auth } from "@/auth";
import { createConfiguredRepository } from "@/lib/repository";

export async function listContracts() {
  const session = await auth();
  if (!session?.accessToken) {
    return [];
  }
  
  const repo = await createConfiguredRepository(session.accessToken);
  return repo.listContracts();
}

export async function saveContract(
  filePath: string,
  content: string,
  commitMessage: string
) {
  const session = await auth();
  if (!session?.accessToken) {
    return { success: false, error: "Unauthorized" };
  }
  
  const repo = await createConfiguredRepository(session.accessToken);
  return repo.saveContract(filePath, content, commitMessage);
}
```

### Using Server Actions in Components

```typescript
"use client";
import { useEffect, useState } from "react";
import { listContracts } from "@/actions/contracts";
import type { APIContract } from "@/types";

export function ContractList() {
  const [contracts, setContracts] = useState<APIContract[]>([]);
  
  useEffect(() => {
    listContracts().then(setContracts);
  }, []);
  
  return <ul>{contracts.map(c => <li key={c.filePath}>{c.name}</li>)}</ul>;
}
```

## ContractRepository Pattern

Abstracts GitHub vs Local filesystem:

```typescript
// lib/repository/index.ts
import { GitHubContractRepository } from "./github";
import { LocalContractRepository } from "./local";

export async function createConfiguredRepository(
  accessToken: string
): Promise<ContractRepository> {
  // Uses GITHUB_OWNER and GITHUB_REPO from environment
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  
  if (!owner || !repo) {
    throw new Error("GITHUB_OWNER and GITHUB_REPO must be configured");
  }
  
  return new GitHubContractRepository(
    { owner, repo, defaultBranch: "main", contractsPath: "contracts" },
    accessToken
  );
}
```

## State Machines

Wizard flows are managed by XState v5:

```typescript
// Import wizard machine
import { importWizardMachine } from "@/machines/import-wizard";
import { useMachine } from "@xstate/react";

function ImportWizard() {
  const [state, send] = useMachine(importWizardMachine);
  
  // state.value: 'idle' | 'selectSource' | 'uploadFile' | 'processing' | ...
  // state.context: { sourceType, file, generatedSpec, ... }
  
  return (
    <div>
      {state.matches('selectSource') && (
        <SourceSelector 
          onSelect={(type) => send({ type: 'SELECT_SOURCE', sourceType: type })} 
        />
      )}
      {state.matches('processing') && <ProcessingIndicator />}
      {/* ... */}
    </div>
  );
}
```

## Keyboard Shortcuts

The platform includes keyboard shortcuts for common actions:

| Shortcut | Action | Location |
|----------|--------|----------|
| `/` | Focus search | Contracts page |
| `Cmd/Ctrl + I` | Go to Import | Contracts page |
| `Cmd/Ctrl + S` | Save | Editor |
| `Cmd/Ctrl + Enter` | Submit | Dialogs |
| `Escape` | Close dialog | All dialogs |

## Troubleshooting

### "AUTH_SECRET is not set"

Generate a secret:
```bash
pnpm dlx auth secret
```

Or manually:
```bash
openssl rand -base64 32
```

### "GitHub OAuth callback error"

Verify your callback URL in GitHub OAuth App settings matches:
```
http://localhost:3000/api/auth/callback/github
```

### "GITHUB_OWNER and GITHUB_REPO must be configured"

Ensure these environment variables are set in `.env.local`:
```env
GITHUB_OWNER=your-username-or-org
GITHUB_REPO=your-contracts-repo
```

### "Rate limit exceeded" from GitHub API

GitHub API has rate limits (5000 requests/hour authenticated). The app caches responses where possible. For development, consider using a personal access token with higher limits.

### Build fails with type errors

```bash
pnpm tsc --noEmit
```

Review the TypeScript errors. Common issues:
- Missing NextAuth type extensions in `types/next-auth.d.ts`
- Incorrect session access (use `await auth()` in server, `useSession()` in client)

## Next Steps

1. **Sign in with GitHub**: Click "Sign in" to authenticate with your GitHub account
2. **Configure repository**: The repository is pre-configured via environment variables
3. **Import first contract**: Use the Import wizard to convert existing API docs
4. **Create from scratch**: Start with the guided editor for new contracts
5. **Review contracts**: Make changes and create PRs for team review
