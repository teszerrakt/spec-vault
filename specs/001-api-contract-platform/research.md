# Research: Centralized API Contract Platform

**Date**: 2026-01-23  
**Feature**: 001-api-contract-platform

## Technology Decisions

### 1. Frontend Framework

**Decision**: Next.js 16 with App Router  
**Rationale**: Next.js 16 provides the latest features including improved Server Components, enhanced caching strategies, and better Turbopack stability for faster development builds. Full-stack TypeScript framework with built-in Route Handlers eliminates need for separate backend. App Router provides server components for GitHub API calls, reducing client bundle size. Vercel deployment simplifies infrastructure.  
**Alternatives considered**:
- Next.js 14/15: Stable but missing performance improvements in v16
- Remix: Excellent DX but smaller ecosystem, less AI SDK integration
- SvelteKit: Great performance but team familiarity with React preferred
- Separate React + Express: More operational complexity, two deployments

### 2. State Management for Wizards

**Decision**: XState v5  
**Rationale**: Complex multi-step wizards (import flow, editor flow) benefit from explicit state machines. XState provides visual debugging, prevents impossible states, and handles async actions (AI calls, GitHub API) cleanly.  
**Alternatives considered**:
- React Hook Form + useState: Works for simple forms, breaks down with complex conditional flows
- Zustand: Good for global state, not designed for sequential flows
- Redux: Overkill, no visual debugging for state machines

### 3. AI Integration

**Decision**: Vercel AI SDK  
**Rationale**: Provider-agnostic SDK allows switching between OpenAI, Anthropic, Google, etc. without code changes. Built-in streaming support for better UX during long AI processing. Native Next.js integration.  
**Alternatives considered**:
- Direct OpenAI SDK: Vendor lock-in, no streaming abstraction
- LangChain: Heavy abstraction, more complexity than needed for conversion tasks
- Custom fetch wrapper: Missing streaming, retry logic, provider switching

### 4. UI Components

**Decision**: shadcn/ui + Tailwind CSS  
**Rationale**: Copy-paste components give full control and customization. Radix primitives ensure accessibility. Tailwind provides rapid styling with consistent design tokens.  
**Alternatives considered**:
- Material UI: Opinionated styling, harder to customize
- Chakra UI: Good but heavier runtime
- Headless UI only: More work to style from scratch

### 5. OpenAPI Validation

**Decision**: @apidevtools/swagger-parser + custom schema validation  
**Rationale**: Industry-standard OpenAPI parser with full validation. Supports $ref resolution, circular reference detection, and provides detailed error messages.  
**Alternatives considered**:
- openapi-validator: Less mature, fewer edge cases handled
- Manual JSON Schema validation: Missing OpenAPI-specific rules
- Spectral: Linting-focused, less suitable for real-time validation

### 6. GitHub Integration & Authentication

**Decision**: NextAuth.js (Auth.js) v5 with GitHub Provider + Octokit  
**Rationale**: NextAuth.js (now branded as Auth.js) is the de-facto authentication library for Next.js. v5 is designed for App Router with native support for Server Components, Route Handlers, and Middleware. Provides secure OAuth flow with PKCE, automatic token refresh, JWT/database sessions, and built-in CSRF protection. Octokit is the official GitHub API client with TypeScript types for all GitHub operations.  
**Alternatives considered**:
- Lucia Auth: Good lightweight option but less ecosystem support
- Clerk/Auth0: External service dependency, adds latency and cost
- Custom OAuth implementation: Security risk, maintenance burden, missing PKCE/refresh logic
- Passport.js: Express-focused, poor Next.js App Router integration

### 7. YAML Handling

**Decision**: js-yaml for parsing/serializing  
**Rationale**: Fast, well-maintained, handles all YAML 1.2 features needed for OpenAPI specs. Preserves comments when using safe schema.  
**Alternatives considered**:
- yaml: Slightly more features but larger bundle
- yamljs: Less maintained

### 8. Diff & Changelog Generation

**Decision**: openapi-diff + custom human-readable formatter  
**Rationale**: openapi-diff understands OpenAPI semantics (breaking vs non-breaking changes). Custom formatter transforms diff output into user-friendly changelog entries.  
**Alternatives considered**:
- Generic JSON diff: Misses OpenAPI-specific breaking change detection
- oasdiff: CLI-focused, harder to integrate programmatically
- Manual diff logic: Complex to handle all OpenAPI constructs correctly

### 9. File Processing (Import)

**Decision**: 
- Excel: xlsx library
- CSV: papaparse
- Images: Vercel AI SDK vision capabilities  

**Rationale**: Well-maintained libraries with good TypeScript support. AI vision handles image-to-text extraction for API documentation screenshots.  
**Alternatives considered**:
- exceljs: Larger bundle, more features than needed
- csv-parse: Node-only, papaparse works in browser too
- Tesseract.js: OCR only, AI provides better context understanding

### 10. Testing Strategy

**Decision**: Vitest (unit) + Playwright (E2E)  
**Rationale**: Vitest is fast, Jest-compatible, native TypeScript. Playwright provides cross-browser E2E testing with excellent async handling.  
**Alternatives considered**:
- Jest: Slower, more configuration needed
- Cypress: Slower E2E execution, no native fetch mocking

### 11. Data Layer Architecture

**Decision**: Server Actions with ContractRepository pattern  
**Rationale**: Server Actions (Next.js 16) provide type-safe RPC-style function calls directly from client components, eliminating the need for REST API endpoints. The ContractRepository pattern abstracts the persistence layer, allowing seamless switching between GitHub (production) and Local filesystem (development) without changing business logic.  
**Alternatives considered**:
- REST API with Route Handlers: More boilerplate, need to document API, no type safety between client/server
- tRPC: Additional dependency, Server Actions provide similar benefits natively
- GraphQL: Overkill for this use case, adds complexity

**Benefits of Server Actions**:
- Type-safe end-to-end (TypeScript inference from server to client)
- No API serialization/deserialization boilerplate
- Automatic request deduplication
- Built-in form handling with progressive enhancement
- Simpler mental model (just call a function)

**ContractRepository Interface**:
```typescript
interface ContractRepository {
  listContracts(path?: string): Promise<APIContract[]>;
  getContract(filePath: string): Promise<APIContract>;
  saveContract(filePath: string, spec: OpenAPIObject, message: string): Promise<SaveResult>;
  deleteContract(filePath: string, message: string): Promise<void>;
  getHistory(filePath: string): Promise<ContractVersion[]>;
  createPullRequest?(options: PROptions): Promise<PullRequestResult>;
  
  readonly type: 'github' | 'local';
}
```

## Integration Patterns

### GitHub OAuth Flow (NextAuth.js v5)

```
1. User clicks "Sign in with GitHub" 
2. NextAuth.js redirects to GitHub OAuth authorization page
3. User authorizes the application on GitHub
4. GitHub redirects to /api/auth/callback/github with authorization code
5. NextAuth.js exchanges code for access token (server-side, secure)
6. Token stored in encrypted JWT session cookie
7. Session available via useSession() hook or getServerSession()
8. Token refresh handled automatically by NextAuth.js callbacks
```

**NextAuth.js Configuration (auth.ts)**:
```typescript
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: { scope: "read:user user:email repo" }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    }
  }
});
```

### Import Wizard XState Flow

```
States: idle → selectSource → uploadFile → processing → preview → editing → complete

Events:
- SELECT_SOURCE: Choose file type (JSON, CSV, Excel, image, text)
- UPLOAD: File uploaded
- PROCESS: AI conversion starts
- PREVIEW: Show generated OpenAPI for review
- EDIT: User makes corrections
- SAVE: Commit to GitHub
- BACK: Return to previous step
```

### Editor Wizard XState Flow

```
States: loading → info → servers → paths → schemas → security → review → saving

Each state validates its section before allowing progression.
Can jump to any previously completed section.
Final review shows full spec with all validation errors.
```

## Security Considerations

1. **OAuth tokens**: Managed by NextAuth.js, stored in encrypted JWT cookies, automatic refresh
2. **NextAuth.js security**: Built-in CSRF protection, PKCE for OAuth, secure cookie settings
3. **Server Actions security**: All Server Actions run on server, automatic CSRF protection via Next.js
4. **GitHub API calls**: All made server-side via Storage Adapter, never exposed to client
5. **AI API keys**: Environment variables, never bundled in client code
6. **File uploads**: Size limits enforced server-side, file type validation before processing
7. **YAML parsing**: Use safe schema to prevent code execution
8. **Middleware protection**: NextAuth.js middleware protects routes before rendering

## Performance Optimizations

1. **Server Components**: GitHub API calls in server components reduce client bundle
2. **Streaming AI responses**: Show progress during long AI conversions
3. **Pagination**: Contract list pagination for large repositories
4. **Caching**: SWR/React Query for GitHub data with stale-while-revalidate
5. **Code splitting**: Route-based splitting for editor, import wizard, etc.
