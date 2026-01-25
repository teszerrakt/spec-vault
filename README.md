# Spec Vault

A centralized API contract platform that stores and manages OpenAPI specifications in GitHub repositories.

## Features

- **GitHub-backed storage**: API contracts are stored as YAML files in your GitHub repository
- **Version history**: Full Git history for all contract changes
- **Import wizard**: Import OpenAPI specs from URLs, files, or paste YAML/JSON directly
- **Visual editor**: Edit contracts with a user-friendly form-based interface
- **PR workflow**: Submit changes for review via GitHub Pull Requests
- **AI-powered**: Generate PR titles and descriptions using OpenAI
- **Role-based access**: Admin, write, and read permissions based on GitHub repository access

## Prerequisites

- Node.js 20+
- pnpm 9+
- GitHub account
- GitHub OAuth App
- OpenAI API key (optional, for AI features)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/spec-vault.git
cd spec-vault
pnpm install
```

### 2. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: Spec Vault (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy the **Client ID**
6. Generate and copy a **Client Secret**

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```bash
# GitHub OAuth App credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# NextAuth.js secret (generate with: pnpm dlx auth secret)
AUTH_SECRET=your_auth_secret

# OpenAI API key for AI features (optional)
OPENAI_API_KEY=your_openai_api_key

# GitHub Repository Configuration (REQUIRED)
# This is the repository where API contracts will be stored
GITHUB_OWNER=your-org-or-username
GITHUB_REPO=api-contracts
```

Generate the `AUTH_SECRET`:

```bash
pnpm dlx auth secret
```

### 4. Prepare your contracts repository

The `GITHUB_OWNER` and `GITHUB_REPO` environment variables point to the GitHub repository where your API contracts will be stored. This can be:

- An existing repository (Spec Vault will create a `contracts/` directory)
- A new empty repository

Make sure your GitHub user has **write access** to this repository.

### 5. Run the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

## Configuration

### Platform Settings

Administrators can configure these settings via the Settings page:

| Setting | Description | Default |
|---------|-------------|---------|
| **Default Branch** | Branch used for reading/writing contracts | `main` |
| **Contracts Path** | Directory where contract files are stored | `contracts` |

These settings are stored in `.api-platform/config.json` within your contracts repository.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App client secret |
| `AUTH_SECRET` | Yes | NextAuth.js session encryption secret |
| `GITHUB_OWNER` | Yes | GitHub org or username for contracts repo |
| `GITHUB_REPO` | Yes | Repository name for contracts |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features |
| `GITHUB_DEFAULT_BRANCH` | No | Default branch (fallback: `main`) |
| `GITHUB_CONTRACTS_PATH` | No | Contracts directory (fallback: `contracts`) |

## Project Structure

```
src/
├── actions/          # Server actions
├── app/              # Next.js App Router pages
│   ├── (dashboard)/  # Authenticated pages
│   │   ├── contracts/
│   │   ├── import/
│   │   └── settings/
│   └── login/
├── components/       # React components
│   ├── editor/       # Contract editor components
│   ├── settings/     # Settings page components
│   └── ui/           # shadcn/ui components
├── lib/
│   ├── ai/           # AI integration (OpenAI)
│   ├── openapi/      # OpenAPI parsing/validation
│   └── repository/   # GitHub repository adapter
└── types/            # TypeScript type definitions
```

## Development

```bash
# Run development server
pnpm dev

# Run tests
pnpm test

# Run linter
pnpm lint

# Format code
pnpm format

# Type check
pnpm tsc --noEmit
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Authentication**: NextAuth.js v5
- **UI Components**: shadcn/ui + Tailwind CSS
- **State Management**: XState (for wizards)
- **AI**: Vercel AI SDK + OpenAI
- **API Storage**: GitHub API via Octokit

## License

MIT
