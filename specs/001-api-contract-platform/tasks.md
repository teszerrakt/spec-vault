# Tasks: Centralized API Contract Platform

**Input**: Design documents from `/specs/001-api-contract-platform/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not included (not explicitly requested in spec). Add test tasks if TDD approach is desired.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US7) this task belongs to

## Path Conventions

Based on plan.md structure:
- Source: `src/`
- Tests: `tests/`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Next.js 16 project with all dependencies and basic configuration

- [x] T001 Initialize Next.js 16 project with `pnpm create next-app@latest` (TypeScript, App Router, Tailwind CSS, src/ directory)
- [x] T002 Initialize shadcn/ui with `pnpm dlx shadcn@latest init`
- [x] T003 [P] Install core dependencies: `pnpm add next-auth@beta @octokit/rest xstate @xstate/react`
- [x] T004 [P] Install AI dependencies: `pnpm add ai @ai-sdk/openai` (Vercel AI SDK)
- [x] T005 [P] Install OpenAPI dependencies: `pnpm add @apidevtools/swagger-parser js-yaml openapi-diff`
- [x] T006 [P] Install file processing dependencies: `pnpm add xlsx papaparse`
- [x] T007 [P] Install dev dependencies: `pnpm add -D vitest @vitejs/plugin-react playwright @types/js-yaml @types/papaparse`
- [x] T008 [P] Create `.env.example` with required environment variables (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, AUTH_SECRET, OPENAI_API_KEY)
- [x] T009 [P] Configure ESLint and Prettier for TypeScript/React

**Checkpoint**: Project initialized with all dependencies installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can begin

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Authentication & Session

- [x] T010 Create NextAuth.js configuration in `src/auth.ts` with GitHub provider
- [x] T011 Create edge-compatible auth config in `src/auth.config.ts`
- [x] T012 Create NextAuth.js route handler in `src/app/api/auth/[...nextauth]/route.ts`
- [x] T013 Create auth middleware in `src/middleware.ts` for route protection
- [x] T014 [P] Create NextAuth.js type extensions in `src/types/next-auth.d.ts`

### Type Definitions

- [x] T015 [P] Create core type definitions in `src/types/index.ts` (APIContract, ContractVersion, ChangelogEntry, ValidationError)
- [x] T016 [P] Create ContractRepository interface in `src/lib/repository/types.ts`
- [x] T017 [P] Create ImportSource types in `src/types/import.ts`

### ContractRepository Pattern

- [x] T018 Create LocalContractRepository in `src/lib/repository/local.ts` (filesystem implementation for dev mode)
- [x] T019 Create GitHubContractRepository in `src/lib/repository/github.ts` (Octokit implementation)
- [x] T020 Create repository factory in `src/lib/repository/index.ts` (selects based on env)

### OpenAPI Utilities

- [x] T021 [P] Create OpenAPI parser utilities in `src/lib/openapi/parser.ts` (YAML parse/serialize)
- [x] T022 [P] Create OpenAPI validator in `src/lib/openapi/validator.ts` (using swagger-parser)

### Shared UI Components

- [x] T023 Add shadcn/ui components: `pnpm dlx shadcn@latest add button card input label textarea select tabs dialog alert sonner`
- [x] T024 [P] Update app layout in `src/app/layout.tsx` with SessionProvider
- [x] T025 [P] Create loading and error components in `src/components/ui/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Browse and Select API Contracts (Priority: P1) 🎯 MVP

**Goal**: Users can view all contracts in the repository and select one to view/edit

**Independent Test**: Load contract list page, verify contracts display with metadata, select one to open

### Server Actions for US1

- [x] T026 [US1] Create `listContracts` Server Action in `src/actions/contracts.ts`
- [x] T027 [US1] Create `getContract` Server Action in `src/actions/contracts.ts`

### UI Components for US1

- [x] T028 [P] [US1] Create ContractCard component in `src/components/contracts/contract-card.tsx`
- [x] T029 [P] [US1] Create ContractList component in `src/components/contracts/contract-list.tsx`
- [x] T030 [P] [US1] Create EmptyState component in `src/components/contracts/empty-state.tsx`
- [x] T031 [P] [US1] Create SearchFilter component in `src/components/contracts/search-filter.tsx`

### Pages for US1

- [x] T032 [US1] Create contracts list page in `src/app/(dashboard)/contracts/page.tsx`
- [x] T033 [US1] Create contract detail page in `src/app/(dashboard)/contracts/[...path]/page.tsx`
- [x] T034 [US1] Create dashboard layout in `src/app/(dashboard)/layout.tsx` with navigation

**Checkpoint**: Users can browse contracts, search/filter, and view details

---

## Phase 4: User Story 2 - Import API Description (Priority: P1)

**Goal**: Users can upload files (JSON, CSV, Excel, image, text) and convert to OpenAPI via AI

**Independent Test**: Upload a JSON file describing API endpoints, verify valid OpenAPI spec is generated

### AI Integration for US2

- [x] T035 [US2] Create AI conversion service in `src/lib/ai/converter.ts` (Vercel AI SDK)
- [x] T036 [US2] Create AI prompt templates in `src/lib/ai/prompts.ts` for each input type

### File Processing for US2

- [x] T037 [P] [US2] Create JSON parser in `src/lib/import/json-parser.ts`
- [x] T038 [P] [US2] Create CSV parser in `src/lib/import/csv-parser.ts` (papaparse)
- [x] T039 [P] [US2] Create Excel parser in `src/lib/import/excel-parser.ts` (xlsx)
- [x] T040 [P] [US2] Create image processor in `src/lib/import/image-processor.ts` (AI vision)
- [x] T041 [US2] Create unified import processor in `src/lib/import/index.ts`

### Import Wizard State Machine for US2

- [x] T042 [US2] Create import wizard XState machine in `src/machines/import-wizard.ts`

### Server Actions for US2

- [x] T043 [US2] Create `processImport` Server Action in `src/actions/import.ts`

### UI Components for US2

- [x] T044 [P] [US2] Create SourceSelector component in `src/components/wizard/source-selector.tsx`
- [x] T045 [P] [US2] Create FileUploader component in `src/components/wizard/file-uploader.tsx`
- [x] T046 [P] [US2] Create TextInput component in `src/components/wizard/text-input.tsx`
- [x] T047 [P] [US2] Create ProcessingIndicator component in `src/components/wizard/processing-indicator.tsx`
- [x] T048 [P] [US2] Create SpecPreview component in `src/components/wizard/spec-preview.tsx`
- [x] T049 [US2] Create ImportWizard container in `src/components/wizard/import-wizard.tsx`

### Pages for US2

- [x] T050 [US2] Create import wizard page in `src/app/(dashboard)/import/page.tsx`

**Checkpoint**: Users can import API descriptions from multiple formats and preview generated specs

---

## Phase 5: User Story 3 - Edit and Validate OpenAPI Specification (Priority: P1)

**Goal**: Users can edit OpenAPI specs through a guided wizard with real-time validation

**Independent Test**: Open a draft spec, edit through guided sections, verify validation feedback works

### Editor Wizard State Machine for US3

- [x] T051 [US3] Create editor wizard XState machine in `src/machines/editor-wizard.ts`

### Server Actions for US3

- [x] T052 [US3] Create `validateSpec` Server Action in `src/actions/validation.ts`

### Editor Section Components for US3

- [x] T053 [P] [US3] Create InfoEditor component in `src/components/editor/info-editor.tsx`
- [x] T054 [P] [US3] Create ServersEditor component in `src/components/editor/servers-editor.tsx`
- [x] T055 [P] [US3] Create PathsEditor component in `src/components/editor/paths-editor.tsx`
- [x] T056 [P] [US3] Create SchemasEditor component in `src/components/editor/schemas-editor.tsx`
- [x] T057 [P] [US3] Create SecurityEditor component in `src/components/editor/security-editor.tsx`
- [x] T058 [P] [US3] Create ReviewPanel component in `src/components/editor/review-panel.tsx`
- [x] T059 [P] [US3] Create RawYamlViewer component in `src/components/editor/raw-yaml-viewer.tsx`
- [x] T060 [P] [US3] Create ValidationErrors component in `src/components/editor/validation-errors.tsx`

### Editor Container for US3

- [x] T061 [US3] Create EditorWizard container in `src/components/editor/editor-wizard.tsx`

### Pages for US3

- [x] T062 [US3] Create editor page in `src/app/(dashboard)/edit/[...path]/page.tsx`

**Checkpoint**: Users can edit specs through guided workflow with real-time validation

---

## Phase 6: User Story 4 - Store and Version Contracts in GitHub (Priority: P1)

**Goal**: Users can save validated specs to GitHub with commit history

**Independent Test**: Save a validated spec, verify file created in GitHub with commit history

### Server Actions for US4

- [x] T063 [US4] Create `saveContract` Server Action in `src/actions/contracts.ts`
- [x] T064 [US4] Create `deleteContract` Server Action in `src/actions/contracts.ts`
- [x] T065 [US4] Create `getContractHistory` Server Action in `src/actions/github.ts`

### UI Components for US4

- [x] T066 [P] [US4] Create SaveDialog component in `src/components/contracts/save-dialog.tsx`
- [x] T067 [P] [US4] Create HistoryPanel component in `src/components/contracts/history-panel.tsx`
- [x] T068 [P] [US4] Create VersionList component in `src/components/contracts/version-list.tsx`

### Integration for US4

- [x] T069 [US4] Integrate save functionality into EditorWizard in `src/components/editor/editor-wizard.tsx`
- [x] T070 [US4] Add history tab to contract detail page in `src/app/(dashboard)/contracts/[...path]/page.tsx`

**Checkpoint**: Users can save contracts with commits and view version history

---

## Phase 7: User Story 5 - Submit Contract for Review via GitHub PR (Priority: P2)

**Goal**: Users can create GitHub PRs for contract changes and are redirected to GitHub

**Independent Test**: Submit changes for review, verify PR created and user redirected to GitHub PR URL

### Server Actions for US5

- [x] T071 [US5] Create `createPullRequest` Server Action in `src/actions/github.ts`
- [x] T072 [US5] Create `createBranch` helper in `src/lib/repository/github.ts`

### UI Components for US5

- [x] T073 [P] [US5] Create PRDialog component in `src/components/contracts/pr-dialog.tsx`
- [x] T074 [P] [US5] Create BranchSelector component in `src/components/contracts/branch-selector.tsx`

### Integration for US5

- [x] T075 [US5] Add "Submit for Review" option to SaveDialog in `src/components/contracts/save-dialog.tsx`

**Checkpoint**: Users can create PRs and are redirected to GitHub for review

---

## Phase 8: User Story 6 - Generate Changelogs from Contract Diffs (Priority: P2)

**Goal**: Auto-generate human-readable changelogs when contracts change

**Independent Test**: Compare two versions, verify changelog lists additions/removals/modifications

### Changelog Service for US6

- [ ] T076 [US6] Create changelog generator in `src/lib/changelog/generator.ts` (using openapi-diff)
- [ ] T077 [US6] Create changelog formatter in `src/lib/changelog/formatter.ts` (human-readable output)

### Server Actions for US6

- [ ] T078 [US6] Create `generateChangelog` Server Action in `src/actions/contracts.ts`

### UI Components for US6

- [ ] T079 [P] [US6] Create ChangelogViewer component in `src/components/contracts/changelog-viewer.tsx`
- [ ] T080 [P] [US6] Create ChangeItem component in `src/components/contracts/change-item.tsx`
- [ ] T081 [P] [US6] Create VersionCompare component in `src/components/contracts/version-compare.tsx`

### Integration for US6

- [ ] T082 [US6] Add changelog to version history in `src/components/contracts/history-panel.tsx`

**Checkpoint**: Users can view auto-generated changelogs between versions

---

## Phase 9: User Story 7 - Configure GitHub Repository Connection (Priority: P2)

**Goal**: Administrators can configure which GitHub repository stores contracts

**Independent Test**: Complete repository configuration, verify system can read/write to the repo

### Server Actions for US7

- [ ] T083 [US7] Create `listRepositories` Server Action in `src/actions/github.ts`
- [ ] T084 [US7] Create `validateRepository` Server Action in `src/actions/github.ts`
- [ ] T085 [US7] Create `saveRepositoryConfig` Server Action in `src/actions/github.ts`

### UI Components for US7

- [ ] T086 [P] [US7] Create RepositorySelector component in `src/components/settings/repository-selector.tsx`
- [ ] T087 [P] [US7] Create ConnectionStatus component in `src/components/settings/connection-status.tsx`
- [ ] T088 [P] [US7] Create SettingsForm component in `src/components/settings/settings-form.tsx`

### Pages for US7

- [ ] T089 [US7] Create settings page in `src/app/(dashboard)/settings/page.tsx`

### Auth Pages for US7

- [ ] T090 [P] [US7] Create login page in `src/app/(auth)/login/page.tsx`
- [ ] T091 [US7] Create auth layout in `src/app/(auth)/layout.tsx`

**Checkpoint**: Users can configure repository connection and authenticate with GitHub

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that span multiple user stories

- [ ] T092 [P] Add error boundaries to all pages
- [ ] T093 [P] Add loading states with Suspense boundaries
- [ ] T094 [P] Implement toast notifications for success/error feedback
- [ ] T095 [P] Add keyboard shortcuts for common actions
- [ ] T096 Implement pagination for contract list (large repositories)
- [ ] T097 [P] Add responsive design for mobile/tablet
- [ ] T098 Code cleanup: remove unused imports, consolidate duplicate logic
- [ ] T099 Performance audit: check bundle size, optimize imports
- [ ] T100 Security audit: verify all sensitive operations are server-side
- [ ] T101 Run quickstart.md validation to verify setup instructions

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → [User Stories can begin]
                                         ↓
                    ┌────────────────────┼────────────────────┐
                    ↓                    ↓                    ↓
              Phase 3 (US1)        Phase 4 (US2)        Phase 9 (US7)
              Browse/Select         Import               Settings
                    │                    │                    │
                    └──────────┬─────────┘                    │
                               ↓                              │
                         Phase 5 (US3)                        │
                         Edit/Validate                        │
                               ↓                              │
                         Phase 6 (US4) ←──────────────────────┘
                         Save/Version
                               ↓
                    ┌──────────┴──────────┐
                    ↓                     ↓
              Phase 7 (US5)         Phase 8 (US6)
              Pull Requests          Changelogs
                    │                     │
                    └──────────┬──────────┘
                               ↓
                        Phase 10 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|------------|-----------------|
| US1 (Browse) | Foundational | Phase 2 complete |
| US2 (Import) | Foundational | Phase 2 complete |
| US3 (Edit) | US1 (view contracts) | Phase 3 complete |
| US4 (Save) | US3 (editor), US7 (repo config) | Phase 5 + Phase 9 complete |
| US5 (PR) | US4 (saving works) | Phase 6 complete |
| US6 (Changelog) | US4 (version history) | Phase 6 complete |
| US7 (Settings) | Foundational | Phase 2 complete |

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
```
T014, T015, T016, T017 can run in parallel (type definitions)
T021, T022 can run in parallel (OpenAPI utilities)
T024, T025 can run in parallel (UI components)
```

**Within Phase 4 (US2 - Import)**:
```
T037, T038, T039, T040 can run in parallel (file parsers)
T044, T045, T046, T047, T048 can run in parallel (wizard components)
```

**Within Phase 5 (US3 - Editor)**:
```
T053, T054, T055, T056, T057, T058, T059, T060 can run in parallel (editor sections)
```

**Across User Stories** (with multiple developers):
```
After Phase 2:
- Developer A: US1 (Browse) → US3 (Edit)
- Developer B: US2 (Import)
- Developer C: US7 (Settings)

After US3 + US7:
- Developer A: US4 (Save) → US5 (PR)
- Developer B: US6 (Changelog)
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - Browse Contracts
4. Complete Phase 4: US2 - Import
5. Complete Phase 5: US3 - Edit/Validate
6. Complete Phase 9: US7 - Settings (needed for GitHub)
7. Complete Phase 6: US4 - Save/Version
8. **STOP and VALIDATE**: Core workflow is complete
9. Deploy MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1, US2, US3, US4, US7 | Browse, import, edit, save contracts |
| +PR Review | US5 | Team collaboration via GitHub |
| +Changelogs | US6 | Change tracking and communication |
| +Polish | - | Production-ready refinements |

### Suggested Starting Point

For a single developer:
```
Day 1-2: Phase 1 + Phase 2 (Setup + Foundation)
Day 3: Phase 3 (US1 - Browse)
Day 4-5: Phase 4 (US2 - Import)
Day 6-7: Phase 5 (US3 - Edit)
Day 8: Phase 9 (US7 - Settings)
Day 9: Phase 6 (US4 - Save)
Day 10: Phase 10 (Polish MVP)
```

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [USx] label maps task to specific user story
- Each user story should be independently testable at its checkpoint
- Commit after each task or logical group
- Use CLI tools (shadcn, pnpm create) per AGENTS.md guidelines
- All Server Actions go in `src/actions/` directory
- ContractRepository abstracts GitHub vs local filesystem
