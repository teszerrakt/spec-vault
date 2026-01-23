# Quickstart: API Contract Platform

**Feature**: 001-api-contract-platform  
**Date**: 2026-01-23

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
cd api-contract-platform

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
# NextAuth.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>

# GitHub OAuth App
# Create at: https://github.com/settings/developers
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# AI Provider (Vercel AI SDK)
# At least one provider required
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Configure:
   - **Application name**: API Contract Platform (Dev)
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
│   │   ├── contracts/       # Contract list, view, edit
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
├── lib/
│   └── repository/          # ContractRepository pattern
│       ├── types.ts         # Interface
│       ├── github.ts        # GitHub (Octokit)
│       └── local.ts         # Local filesystem
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
pnpm test:coverage      # Generate coverage report

# Code Quality
pnpm lint               # ESLint
pnpm typecheck          # TypeScript check
pnpm format             # Prettier

# OpenAPI
pnpm validate:contracts # Validate all OpenAPI specs
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
import { getRepository } from "@/lib/repository";

export async function listContracts() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  
  const repo = await getRepository(session);
  return repo.listContracts();
}

export async function saveContract(
  filePath: string,
  spec: OpenAPIObject,
  commitMessage: string
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  
  const repo = await getRepository(session);
  return repo.saveContract(filePath, spec, commitMessage);
}
```

### Using Server Actions in Components

```typescript
"use client";
import { listContracts } from "@/actions/contracts";

export function ContractList() {
  const [contracts, setContracts] = useState([]);
  
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

export async function getRepository(session: Session): Promise<ContractRepository> {
  if (process.env.NEXT_PUBLIC_DEV_MODE === "true") {
    return new LocalContractRepository("./local-contracts");
  }
  
  return new GitHubContractRepository(session.repositoryConfig, session.accessToken);
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
      {state.matches('selectSource') && <SourceSelector onSelect={(type) => send({ type: 'SELECT_SOURCE', sourceType: type })} />}
      {state.matches('processing') && <ProcessingIndicator />}
      {/* ... */}
    </div>
  );
}
```

## Local Development Mode

For development without GitHub:

```env
# .env.local
NEXT_PUBLIC_DEV_MODE=true
```

In dev mode:
- Contracts stored in `./local-contracts/` directory
- No GitHub OAuth required
- Mock session provided

## Troubleshooting

### "NEXTAUTH_SECRET is not set"

Generate a secret:
```bash
openssl rand -base64 32
```

### "GitHub OAuth callback error"

Verify your callback URL in GitHub OAuth App settings matches:
```
http://localhost:3000/api/auth/callback/github
```

### "Rate limit exceeded" from GitHub API

GitHub API has rate limits (5000 requests/hour authenticated). The app caches responses where possible. For development, consider using a personal access token with higher limits.

### Build fails with type errors

```bash
pnpm typecheck
```

Review the TypeScript errors. Common issues:
- Missing NextAuth type extensions in `types/next-auth.d.ts`
- Incorrect session access (use `await auth()` in server, `useSession()` in client)

## Next Steps

1. **Configure repository**: Go to Settings after login to connect a GitHub repository
2. **Import first contract**: Use the Import wizard to convert existing API docs
3. **Create from scratch**: Start with the guided editor for new contracts
4. **Review contracts**: Make changes and create PRs for team review
