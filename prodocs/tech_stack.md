# The Adaptive Learning Ledger — Technology Stack & Architecture

**Project Name:** The Adaptive Learning Ledger  
**Project Purpose:** An AI-assisted dynamic curriculum and Proof-of-Work learning tracker that prevents information hoarding.  
**Architecture Model:** Monorepo (`apps/frontend` + `apps/backend` + `supabase/migrations`)  
**Status:** MVP / Phase 1 — Validating the Adaptive Engine hypothesis

---

## 1. Technology Stack Selection

This section summarizes the rationale for each layer, production code versions, and technical trade-offs.

### 1.1 Stack Summary

| Layer | Technology | Version / Notes |
|-------|------------|-----------------|
| **Frontend** | Next.js (App Router) | 16.x |
| | React | 19.x |
| | TypeScript | 5.x |
| | Tailwind CSS | 4.x |
| | UI Icons | Lucide React |
| **Backend** | Node.js + Express | Express 5.x |
| | Validation | Zod 3.x |
| | Testing | Node.js native test runner + Supertest |
| **Database & Auth** | Supabase | PostgreSQL + Row Level Security (RLS) |
| | Client SDK | `@supabase/supabase-js` |
| **AI** | OpenAI API | `gpt-4o-mini` (default), `gpt-4o` (optional) |
| **Deployment Target** | Web-first | Frontend: Vercel-compatible; Backend: standalone HTTP service |

### 1.2 Frontend — Next.js + Tailwind CSS

| Criterion | Decision | Rationale |
|-----------|----------|-----------|
| **Rendering model** | Next.js App Router | File-based routing (`app/`), Server/Client Component split, and SEO-friendly public showcase pages (`/showcase/[slug]`) managed under one roof. |
| **Styling system** | Tailwind CSS v4 | Utility-first approach; design tokens centralized in `design-system.css`. Fast iteration and consistent "Deep Work" aesthetic. |
| **Type safety** | TypeScript | API responses, workspace state, and auth flows validated at compile time; safe transfer of structured LLM data to the frontend. |
| **Auth client** | Supabase JS SDK | Session management on frontend; JWT stored in `sessionStorage` + cookie marker (`ledger_session`). Sent to backend via `Authorization: Bearer` header. |

**Why Next.js?**  
Natural fit with the Supabase ecosystem (auth callback, public/private route split), fast MVP delivery, and low operational overhead for a solo developer. Dashboard, workspace editor, and public portfolio can live in the same codebase.

### 1.3 Backend — Node.js + Express

| Criterion | Decision | Rationale |
|-----------|----------|-----------|
| **API layer** | Express 5 | Thin, predictable REST API; AI calls and business logic isolated from frontend. |
| **Monorepo split** | Separate `apps/backend` service | OpenAI API key and service-role Supabase access stay server-side only; never exposed to client. |
| **Schema validation** | Zod | LLM outputs (`syllabusPayload`, `resourceMetadata`) parsed and normalized; hallucination or format errors handled via graceful degradation. |
| **Security** | `requireAuth` middleware, rate limiting, idempotency | All mutation endpoints protected by JWT validation + idempotency key. |

**Why a separate backend?**  
LLM prompt engineering, metadata enrichment, and the adaptive calendar engine must run server-side. This layer controls token cost, centralizes timeout/retry policies, and manages the structured output pipeline from a single point.

### 1.4 Database & Auth — Supabase (PostgreSQL + RLS)

| Criterion | Decision | Rationale |
|-----------|----------|-----------|
| **Data model** | PostgreSQL (Supabase) | Relational schema: `profiles`, `folders`, `resources`, `curricula`, `curriculum_items`, `schedule_assignments`, `notes`. JSONB `metadata` fields provide flexibility for AI enrichment output. |
| **Security** | Row Level Security (RLS) | All user data is `private` by default. Public showcase exposed only through opt-in publish flow. |
| **Auth** | Supabase Auth | Email/password flow; JWT-based sessions. Backend runs in RLS context with anon key + user JWT; admin operations limited to service-role. |
| **Migration** | `supabase/migrations/` | Schema changes managed via versioned SQL files (e.g. sprint duration, daily goal, schedule velocity). |

**Why Supabase?**  
Auth + PostgreSQL + realtime capabilities on one platform. Eliminates the cost of standing up a separate auth service or ORM layer for MVP. RLS enforces the "privacy-first" product principle at the database level.

### 1.5 AI API — OpenAI (GPT-4o-mini / GPT-4o)

| Use Case | Model Choice | Rationale |
|----------|--------------|-----------|
| **Resource metadata enrichment** | `gpt-4o-mini` | Low token consumption; structured output via `response_format: json_object`. Temperature: 0.2 — consistency prioritized. |
| **Full syllabus generation** | `gpt-4o-mini` (default) | 30-day sprint plan, weekly distribution, consumption/practice time estimates. Comprehensive plans via `max_completion_tokens: 12_000`. |
| **Critical / complex plans** | `gpt-4o` (optional, `OPENAI_MODEL` env) | Upgrade via single environment variable when deeper conceptual mapping is needed. |
| **Gap suggestions** | Within syllabus payload | `gap_suggestions` field for missing concepts; search query + rationale generation. |

**Cost-Performance Decision:**  
GPT-4o-mini delivers sufficient quality for syllabus generation and enrichment at low unit cost. Structured JSON output validated by Zod schemas reduces dependency on more expensive models. Production model selection can be changed at runtime via `OPENAI_MODEL` — no redeploy required.

### 1.6 Consciously Not Selected

| Alternative | Why Not Chosen |
|-------------|----------------|
| Full-stack framework (tRPC, NestJS) | Over-abstraction for MVP scope; Express is sufficient and readable. |
| Vector database / RAG | Low resource count in Phase 1; URL metadata + LLM prompt is enough. |
| Claude API | OpenAI SDK and `json_object` response format integrated into existing pipeline; model swap possible later. |
| Firebase | Relational data model (curriculum → items → schedule) is more natural in PostgreSQL. |

---

## 2. System Architecture & AI Integration

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                           │
│  Landing · Home Dashboard · Workspace Editor · Public Showcase      │
│                                                                     │
│  Supabase Auth (JWT)          apiFetch() → Backend REST API         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS + Bearer Token
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express /api)                          │
│                                                                     │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────────┐  │
│  │ requireAuth │  │ Scheduling Engine │  │ Resource Fetch/Kind  │  │
│  │ rate limits │  │ (deterministic)   │  │ (YouTube, HTML, …)   │  │
│  └─────────────┘  └──────────────────┘  └─────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              AI Services (OpenAI)                            │   │
│  │  syllabusLlm.js          resourceEnrichment.js               │   │
│  │  → Structured JSON     → title, summary, duration, kind      │   │
│  │  → Zod validation      → Zod validation                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Service Role + RLS context
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SUPABASE (PostgreSQL + Auth)                      │
│  profiles · folders · resources · curricula · schedule_assignments  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow: Resource Capture → Enrichment

1. **User** pastes a URL in workspace → `POST /api/resources`
2. **Backend** classifies URL (`resourceKind.js`: video, audio, reading, …)
3. **Fetch layer** retrieves page content or YouTube metadata
4. **OpenAI enrichment** call produces `title`, `summary`, `estimated_duration_minutes`, `content_kind`
5. **Zod validation** (`resourceAiMetadataSchema`) passes → written to `resources.metadata.ai`; `ingest_status: enriched`
6. **Frontend** `ResourcesCard` component displays enriched metadata

This pipeline uses the LLM only for structured metadata generation; raw HTML parsing is done by deterministic code.

### 2.3 Data Flow: Syllabus Generation

1. **User** selects resources in a folder → `POST /api/curricula` (generate)
2. **Backend** fetches `enriched` resources from folder in Supabase
3. **`syllabusLlm.js`** sends system + user prompt to OpenAI:
   - Sprint duration (7–90 days, default 30)
   - Per resource: `id`, `url`, `kind`, `title`, `ai` metadata summary
   - Expected JSON schema: `ledger.syllabus.v1`
4. **LLM response** → `normalizeLlmSyllabusJson()` → parsed with `syllabusPayloadV1Schema` (Zod)
5. **`syllabusPersist.js`** writes curriculum + items in transaction-like flow
6. **`schedulingEngine.js`** (deterministic, non-LLM) distributes items across calendar days
7. **Frontend** `WorkspacePage` renders generated plan in schedule cards

**Critical architectural decision:** Calendar rescheduling (adaptive reslide) is not delegated to the LLM. `schedulingEngine.js` runs as pure JavaScript; cost, latency, and predictability remain under control.

### 2.4 Structured Output Pipeline

The core of LLM integration is producing **validatable JSON** instead of free text:

| Schema | File | Purpose |
|--------|------|---------|
| `ledger.syllabus.v1` | `syllabusPayload.js` | Overview, items (week/day/sequence), gap_suggestions |
| Resource AI metadata | `resourceMetadata.js` | title, summary, duration, content_kind |

```javascript
// Example: Syllabus item schema (Zod)
{
  resource_id: uuid,
  week_index: 0–12,
  day_index: 0–6,
  sequence: int,
  consumption_minutes: int | null,
  practice_minutes: int | null,
  rationale: string
}
```

When LLM response deviates from schema:
- Normalize functions fill missing fields, or
- Skeleton fallback rationale is applied (`DEFAULT_SKELETON_RATIONALE`)
- Critical failures return meaningful HTTP error codes

### 2.5 API Surface (Summary)

| Endpoint Group | Auth | AI Dependency |
|----------------|------|---------------|
| `/api/resources` | ✓ | Enrichment (async runner) |
| `/api/curricula` | ✓ | Full syllabus generation |
| `/api/schedule-assignments` | ✓ | None — deterministic engine |
| `/api/notes` | ✓ | None |
| `/api/public/:slug` | ✗ | None — read-only showcase |

Frontend uses `apiFetch(path, options, accessToken)` for all authenticated calls; base URL configured via `NEXT_PUBLIC_BACKEND_URL`.

### 2.6 Adaptive Calendar Engine (Non-AI)

When a user does not complete a task, `schedulingEngine.js`:
- Shifts incomplete items forward ("sliding window")
- Automatically extends sprint end date
- Tracks velocity against daily goal (`daily_minutes_goal`)

This logic is the technical foundation of the product's "Anti-Guilt" value proposition and runs independently of LLM latency.

### 2.7 Security & Privacy

- All learning data locked to user via RLS
- OpenAI API key only in backend `.env`
- Public showcase is opt-in; slug-based read-only endpoint
- Rate limiting (`express-rate-limit`) and idempotency middleware prevent duplicate writes on mutations

---

## 3. AI-Assisted Development Process

This project was built beyond the traditional "spec → implement → review" cycle using **Vibe Coding**: architectural decisions made iteratively through pair-programming with AI agents in Cursor IDE.

### 3.1 Development Environment

| Tool | Role |
|------|------|
| **Cursor IDE** | Primary development environment; code completion, multi-file edit, terminal integration |
| **Cursor Agent (Auto)** | End-to-end feature implementation, refactoring, test writing |
| **Cursor Rules** | `.cursor/rules/` — project vision, Next.js conventions, Zod schema rules |
| **Prodocs** | `PRD.md`, `MVP.md`, `design_system.md` — live documentation providing context to AI agents |

### 3.2 Vibe Coding Workflow

```
Product Vision (PRD)
       │
       ▼
Cursor Rule Definition (.cursor/rules/projectvision.mdc)
       │
       ▼
Natural Language Prompt → Agent Planning → Code Generation → Human Review
       │                                      │
       └──────────── Iteration ◄──────────────┘
```

**Typical session:**

1. **Context injection:** PRD, existing schema, and relevant files given to agent via `@`-mention
2. **Scoped instruction:** Scope limits like "Only change the scheduling engine, do not touch frontend"
3. **Agent output:** Multi-file diff; backend route + Zod schema + frontend API client updated together
4. **Human decision:** Architectural drift rejected (e.g. attempts to put schedule logic in LLM); deterministic engine preferred
5. **Verification:** `node --test` (backend), `npm run dev` (frontend), manual workspace flow test

### 3.3 Architectural Guidance Given to AI Agents

Decisions communicated to agents during development and reflected in the codebase:

| Decision | Agent Instruction | Code Counterpart |
|----------|-------------------|------------------|
| Structured Outputs required | "LLM responses must be validated with Zod" | `syllabusPayload.js`, `resourceMetadata.js` |
| AI ≠ business logic | "Schedule reslide in JS engine, not LLM" | `schedulingEngine.js` |
| Privacy-first | "All data private; publish is opt-in" | RLS policies, `PublishPanel.tsx` |
| Monorepo boundaries | "No OpenAI key on frontend" | `apps/backend/src/services/syllabusLlm.js` |
| MVP-focused scope | "No Phase 1 out-of-scope features" | `MVP.md` roadmap reference |

### 3.4 Persistent Context via Cursor Rules

Rules under `.cursor/rules/` load automatically in every agent session:

- **`projectvision.mdc`** — Product north star, adaptive scheduling principle, UI/UX principles
- **`next-js.mdc`** — App Router conventions, component organization
- **`zod-schemas.mdc`** — LLM output schema versioning standards

These rules maintain consistent code style and architectural alignment across sessions; eliminates the burden of re-explaining from scratch each time.

### 3.5 Human + AI Division of Labor

| Area | AI Agent | Developer (Human) |
|------|----------|-------------------|
| Boilerplate & CRUD routes | ✓ Primary | Review |
| Zod schema design | ✓ Draft | ✓ Approve & edge cases |
| LLM prompt engineering | ✓ Iterative | ✓ Quality evaluation |
| Product/architecture decisions | Suggestion | ✓ Final decision |
| UI/UX aesthetic direction | ✓ Implement | ✓ Design system alignment |
| Security (RLS, auth flow) | ✓ Draft policy | ✓ Audit |

### 3.6 Concrete Development Outputs

Structures produced through the AI-assisted process referenced in this stack document:

- **Monorepo skeleton:** `apps/frontend` (Next.js 16) + `apps/backend` (Express 5)
- **Supabase schema:** 4 migration files; RLS policies included
- **AI pipeline:** Enrichment runner, syllabus LLM, persist layer
- **Adaptive engine:** `schedulingEngine.test.js` with test coverage
- **Frontend workspace:** Resources, Schedule, Notes, Publish, Gap Suggestions cards
- **Public showcase:** Slug-based read-only portfolio page

### 3.7 Lessons Learned (AI-Assisted Dev)

1. **Scope discipline is mandatory:** Without clear file/scope limits, agents produce unnecessary abstractions; "minimize scope" rule repeated in every prompt.
2. **Schema first, prompt second:** Zod schema should be the source of LLM prompt design; reverse engineering increases hallucination.
3. **Deterministic + probabilistic separation:** AI only for "creative planning" and "metadata extraction"; date math and state mutation in pure code.
4. **Living documentation:** When `prodocs/` is used as agent context, generated code stays aligned with PRD.

---

## Appendix: Environment Variables (Reference)

| Variable | Layer | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | Backend API base URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | Public anon key |
| `OPENAI_API_KEY` | Backend | OpenAI API access |
| `OPENAI_MODEL` | Backend | Default: `gpt-4o-mini` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Admin DB operations |

---

*This document serves as a technical competency artifact for The Adaptive Learning Ledger. Stack choices align with MVP goals, cost-performance balance, and the privacy-first product principle.*
