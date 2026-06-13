# The Adaptive Learning Ledger — Development Log

**Project:** The Adaptive Learning Ledger (Curio)  
**Methodology:** AI-Driven Development (Vibe Coding) · Cursor IDE  
**Duration:** 4-Week Lean Sprint (MVP Phase 1)  
**Developer:** Serra  
**Last Updated:** June 13, 2026

---

## Summary

This document records the project's weekly chronological development history. Each entry covers architectural decisions made, technical issues encountered, and debugging sessions run with Cursor AI agents. The daily format is simulated — dates are aligned to the sprint calendar.

| Week | Date Range | Focus |
|------|------------|-------|
| Week 1 | May 19–25, 2026 | Schema, Auth, Link Capture |
| Week 2 | May 26 – June 1, 2026 | LLM Syllabus & Enrichment |
| Week 3 | June 2–8, 2026 | Adaptive Calendar Engine |
| Week 4 | June 9–13, 2026 | Showcase & Publish |

---

## Week 1 — Database Schema & Link Capture UI

### May 19, 2026 — Project skeleton and first Cursor session

**Completed**
- Monorepo structure set up: `apps/frontend` (Next.js 16) + `apps/backend` (Express 5)
- `prodocs/PRD.md` and `.cursor/rules/projectvision.mdc` added to agent context
- Supabase project created; initial migration draft written

**Critical Decision #1 — Separate backend service in monorepo**  
LLM calls placed in a standalone Express service rather than Next.js API Routes, so OpenAI API keys and service-role access never reach the client. Frontend communicates only via `NEXT_PUBLIC_BACKEND_URL`.

**Critical Decision #2 — Privacy-first by default**  
PRD principle "all data private" enforced at schema level: `publish_settings.is_published` defaults to `false`; public endpoint opens only via opt-in slug.

---

### May 20, 2026 — Supabase schema and RLS

**Completed**
- `20260512194500_initial_learning_ledger.sql` migration completed
- `profiles`, `folders`, `resources` tables + `on_auth_user_created` trigger

**Issue → AI Solution: RLS INSERT rejection (403)**

```
Error: POST /api/folders → Supabase 42501 "new row violates row-level security policy"
```

`folders` had a SELECT policy but INSERT policy was missing `with check (user_id = auth.uid())`. Migration SQL file given to Cursor Agent via `@`; agent suggested missing `create policy folders_insert_own` block. After manual review, CRUD policy template applied to all tables.

**Lesson learned:** Testing RLS errors with service-role masks the problem — always debug with user JWT + anon key.

---

### May 21, 2026 — Auth flow and middleware

**Completed**
- `requireAuth` middleware: Bearer token → `auth.getUser()` → user-scoped Supabase client
- `createSupabaseWithUserAccessToken()` — anon key + JWT, RLS active
- Frontend: `LoginForm`, `sessionStorage` token, `ledger_session` cookie marker

**Issue → AI Solution: AuthGuard infinite redirect loop**

On page refresh, `sessionStorage` held a token but cookie was missing; `AuthGuard` redirected to `/`. Cursor prompt:

> "Review AuthGuard and auth.ts; make cookie sync compatible with sessionStorage, break the redirect loop."

Agent added `ensureAuthCookie()` helper; called on layout mount. Loop resolved.

**Critical Decision #3 — User-scoped client as default**  
Documented in `AUTH.md`: all routes touching user data use **anon key + user JWT**, not service-role. Service-role limited to `GET /api/public/:slug` and admin maintenance.

---

### May 22, 2026 — Resource capture UI

**Completed**
- `ResourceDropzone` — paste + drag-drop URL capture
- `POST /api/resources` + `resourceKind.js` heuristic classification
- `HomePage` dashboard skeleton, `Sidebar` curriculum list

**Issue → AI Solution: CORS preflight error**

```
Access to fetch at 'http://localhost:4000/api/resources' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

Backend `cors({ origin: process.env.FRONTEND_URL })` was undefined in `.env`. Agent synchronized `env.js` and `.env.example`; added `FRONTEND_URL=http://localhost:3000`.

---

### May 23–25, 2026 — Week 1 close

**Completed**
- `ResourcesCard` folder-linked list UI
- `apiFetch()` generic client + `ApiRequestError` type
- `GET /api/health` Supabase connectivity check
- First screenshots: login, dashboard (`screenshots/`)

**Week 1 Definition of Done:** ✅ Logged-in user can create folder and save URL; RLS isolation verified.

---

## Week 2 — LLM Syllabus Generation

### May 26, 2026 — OpenAI integration start

**Completed**
- `openai` SDK install, `llmRuntimeEnv.js` timeout/retry config
- `resourceEnrichment.js` — first metadata extraction attempt
- `ingest_status` field: `pending → enriched → failed` state machine

**Critical Decision #4 — GPT-4o-mini as default model**  
After cost-performance analysis, `gpt-4o-mini` chosen for syllabus + enrichment. Upgrade path to `gpt-4o` via `OPENAI_MODEL` env without code changes.

---

### May 27, 2026 — Syllabus generation and JSON crisis

**Completed**
- `syllabusLlm.js` — system prompt + resource catalog
- `POST /api/curricula/:id/generate-structure` endpoint

**Issue → AI Solution: LLM output unparseable on frontend**

```
SyntaxError: Unexpected token '`' in JSON at position 0
```

Model returned response wrapped in `` ```json ... ``` `` markdown fences. Two-phase fix:

1. **Prompt engineering** (Cursor Agent iteration): Added `Return ONLY valid JSON (no markdown)` to system prompt; enforced `response_format: { type: "json_object" }`.
2. **Backend validation layer**: `syllabusPayload.js` — Zod schema `ledger.syllabus.v1` defined; `normalizeLlmSyllabusJson()` strips fences and normalizes fields.

Frontend no longer sees raw LLM JSON — only backend-validated DTO.

**Critical Decision #5 — Structured Outputs mandatory**  
Zod parse → HTTP 422 graceful error → skeleton fallback chain standardized at all LLM consumption points. `.cursor/rules/zod-schemas.mdc` rule created.

---

### May 28, 2026 — Zod schema edge cases

**Issue → AI Solution: Duplicate `resource_id` and missing fields**

LLM added same resource twice to `items` array; `week_index` sometimes returned as float. Agent added deduplication via `syllabusItemRichnessScore()` and strict coercion in `syllabusPayloadV1Schema`. On critical gaps, `DEFAULT_SKELETON_RATIONALE` fallback activates — user never sees empty plan.

**Test:** `syllabusPayload.test.js` — normalize and schema reject scenarios written.

---

### May 29, 2026 — Enrichment pipeline

**Completed**
- `resourceFetch.js` + `youtubeMetadata.js` — URL content preprocessing
- `resourceEnrichmentRunner.js` — async queue
- Enrichment output to `metadata.ai` JSONB field

**Issue → AI Solution: OpenAI timeout (folder with 30+ resources)**

```
Error: Request timed out after 120000ms
```

`llmMaxCompletionTokensSyllabus` raised to 12,000; separate token ceilings for enrichment and syllabus moved to `env.js`. UX: `GardenSpinner` overlay with "planning your path" message; panel dimming.

---

### May 30 – June 1, 2026 — Week 2 close

**Completed**
- `CreateCurriculumPanel`, `SectionsCard`, `GapSuggestionsCard`
- `syllabusPersist.js` — curriculum + items transaction flow
- `generate-structure` → weekly module render in workspace

**Week 2 Definition of Done:** ✅ One-click syllabus from folder with 2+ enriched resources; gap suggestions and time estimates visible.

---

## Week 3 — Adaptive Calendar

### June 2, 2026 — Calendar engine architecture discussion

**Critical Decision #6 — Reslide algorithm in Express backend, not LLM**

Initial draft considered sending a "replan" prompt to LLM for missed days. Rejected:

| Criterion | LLM Reslide | Deterministic Engine |
|-----------|-------------|----------------------|
| Latency | 5–15 sec | <50 ms |
| Cost | Every reslide = API call | Zero |
| Predictability | Hallucination risk | Unit testable |
| Anti-guilt UX | Variable messages | Consistent behavior |

**Critical Decision #7 — Express `schedulingEngine.js` instead of Supabase Edge Function**

Edge Function option considered (low latency, Supabase proximity). Rejected for MVP: scheduling logic requires unit tests (`node --test`), Edge Function local debug is harder, and rebalance algorithm involves multi-table joins. Decision: `apps/backend/src/services/schedulingEngine.js` — pure JavaScript, testable independently of database.

---

### June 3, 2026 — Schedule schema and bootstrap

**Completed**
- `20260514200000_phase4_schedule_velocity.sql` — `schedule_assignments`, `velocity_snapshots`
- `buildBootstrapRowsAcrossSprint()` — auto calendar fill after syllabus
- `POST /api/curricula/:id/schedule/bootstrap`

**Issue → AI Solution: Date off-by-one (timezone)**

User in Turkey (UTC+3); `scheduled_date` produced via `new Date().toISOString()` shifted by one day. Cursor Agent created `calendarDates.js` module: `formatIsoDateOnly()`, `addCalendarDays()`, `localTodayIso()` — all date arithmetic on ISO `YYYY-MM-DD` strings, avoiding UTC midnight trap.

---

### June 4, 2026 — Reslide and anti-guilt UX

**Completed**
- `computeSprintRebalanceUpdates()` — shift incomplete assignments forward
- `POST /api/curricula/:id/schedule/reslide` endpoint
- `ScheduleCard` — `.schedule-reslide-panel` UI (design system: sage tone, non-judgmental copy)

**Issue → AI Solution: Done items incorrectly reslid**

Reslide updated all assignments; completed tasks also changed dates. Agent added `"skips done assignments"` test to `schedulingEngine.test.js`; added `status === 'done'` filter inside `computeSprintRebalanceUpdates`. TDD approach combined with AI prompt:

> "Fix computeSprintRebalanceUpdates per failing scenario in schedulingEngine.test.js; do not touch other files."

---

### June 5, 2026 — Daily goal and sprint duration

**Completed**
- `20260530120000_profile_daily_minutes_goal.sql`
- `20260531120000_curriculum_sprint_days.sql`
- `DailyGoalSettings` chip UI (15/30/45/60 min)
- `SprintDurationControl` — 7–90 day clamp

**Issue → AI Solution: PATCH /api/profile 404**

Migration not applied in Supabase Dashboard; local Express ran but `daily_minutes_goal` column missing in DB. Agent diagnosed as schema drift, not `SERVER_CONFIG`; migration checklist added to `AUTH.md`.

---

### June 6–8, 2026 — Week 3 close

**Completed**
- `WorkspacePage` — auto bootstrap after syllabus + focus on first incomplete module
- `WorkspaceProgressCard` + `BotanicalGrowthIcon` (Sprout → Leaf → Trees)
- `scheduleApi.ts` client layer completed
- `schedulingEngine.test.js` — 4 tests passing

**Vibe Coding Note:** Week 3 had the heaviest agent sessions. Scope constraint required in every prompt: *"Only schedulingEngine.js and schedulingEngine.test.js"*. Without scope, agent produced unnecessary abstraction (`ScheduleServiceFactory`) — "minimize scope" note added to `.cursor/rules`.

**Week 3 Definition of Done:** ✅ Missed days reslide forward; done items preserved; daily goal persists.

---

## Week 4 — Public Portfolio & Share

### June 9, 2026 — Publish flow

**Completed**
- `publish_settings` table RLS policies
- `curriculaPublish.js` — GET/PUT publish settings
- `PublishPanel` — toggle, slug editor, copy link

**Critical Decision #8 — Public showcase service-role; authenticated routes user-JWT**

`GET /api/public/:slug` requires no auth; uses service-role client for RLS bypass. Only records with `is_published = true` + matching slug returned. Gap suggestions and private notes excluded from payload.

---

### June 10, 2026 — Showcase page

**Completed**
- `showcaseAssembler.js` — public DTO assembly
- `app/showcase/[slug]/page.tsx` — SSR route
- `ShowcasePage` — hero, weekly cards, rationale
- `showcaseMetadata.ts` — Open Graph tags

**Issue → AI Solution: Published curriculum 404 on showcase**

`buildShowcasePayload` join required RLS user context on `curriculum_items`; service-role client lacked manual `user_id` filter. Agent added explicit `eq('user_id', ownerId)` chain to `showcaseAssembler.js` — data returned while public endpoint security preserved.

---

### June 11, 2026 — Slug validation and duplicate writes

**Issue → AI Solution: Duplicate slug 500 error**

User rapidly toggled publish on/off; two POSTs collided; unique constraint violation. Two-layer fix:

1. DB: `publish_settings.public_slug` UNIQUE constraint (already existed)
2. Backend: `idempotencyForAuthedMutations()` middleware — `Idempotency-Key` header prevents duplicate writes

`isSaving` lock added to frontend `PublishPanel`.

**Issue → AI Solution: Uppercase and spaces in slug**

`normalizePublicSlug()` and `isValidPublicSlug()` helpers added to `workspaceApi.ts`; input lowercased immediately, regex: `^[a-z0-9]+(-[a-z0-9]+)*$`.

---

### June 12, 2026 — Integration test and design system

**Completed**
- Workspace → Publish → Showcase end-to-end manual test
- `design-system.css` — Workspace/Showcase mode split, anti-guilt color tokens
- `NoteEditor` markdown + public note toggle
- Screenshot: `workspace_editor.png`

**Vibe Coding Note:** For UI consistency, agent given `design_system.md` draft and `design-system.css` together. Agent used existing `.pg-elevated-surface` tokens on new components; did not invent new colors.

---

### June 13, 2026 — Week 4 close and MVP delivery

**Completed**
- `prodocs/tech_stack.md`, `plan.md`, `design_system.md` documentation completed
- Backend test suite run: `npm test` → `schedulingEngine`, `syllabusPayload`, `app` tests passed
- Frontend `npm run build` — production build clean
- Dev environment verified: `npm run dev` (frontend) + `npm run dev` (backend) in parallel

---

## Critical Decisions — Summary Table

| # | Decision | Rationale | Week |
|---|----------|-----------|------|
| 1 | Separate Express backend | API key security, LLM isolation | W1 |
| 2 | Workspace default private | Privacy-first product principle | W1 |
| 3 | User JWT + anon key default | RLS safety net | W1 |
| 4 | GPT-4o-mini default | Cost-performance | W2 |
| 5 | Zod + JSON Schema mandatory | LLM hallucination tolerance | W2 |
| 6 | Deterministic JS reslide | Latency, cost, testability | W3 |
| 7 | Express engine, not Edge Function | Local test, multi-table join | W3 |
| 8 | Public endpoint service-role | RLS bypass, read-only, filtered payload | W4 |

---

## Technical Issues & AI Solutions — Summary

| Issue | Root Cause | AI-Assisted Solution | File |
|-------|------------|----------------------|------|
| RLS 403 INSERT | Missing INSERT policy | Complete migration policies | `initial_learning_ledger.sql` |
| Auth redirect loop | Cookie/sessionStorage mismatch | `ensureAuthCookie()` | `auth.ts` |
| CORS block | `FRONTEND_URL` undefined | `.env.example` sync | `app.js` |
| JSON parse error | Markdown-wrapped LLM output | `json_object` + Zod normalize | `syllabusLlm.js`, `syllabusPayload.js` |
| Duplicate resource_id | LLM duplicate items | Richness score dedup | `syllabusPayload.js` |
| OpenAI timeout | Large syllabus token count | Token cap + spinner UX | `llmRuntimeEnv.js` |
| Date off-by-one | UTC timezone trap | ISO date-only lib | `calendarDates.js` |
| Done item reslide | Missing filter | Unit test + status guard | `schedulingEngine.js` |
| Schema drift 404 | Migration not applied | Migration checklist | `AUTH.md` |
| Showcase 404 | Service-role join filter | Explicit owner filter | `showcaseAssembler.js` |
| Duplicate slug 500 | Double POST | Idempotency middleware | `idempotency.js` |

---

## Vibe Coding — Process Reflection

### Prompt patterns that worked

```
@syllabusPayload.js @syllabusLlm.js
LLM response deviates from Zod schema. Add markdown fence strip to
normalizeLlmSyllabusJson. Only touch these two files.
```

```
@schedulingEngine.js @schedulingEngine.test.js
"skips done assignments" test is red. Fix computeSprintRebalanceUpdates.
Do not add new abstractions.
```

### Approaches that failed

- **Broad scope prompt:** "Refactor the schedule system" → produced unnecessary `ScheduleServiceFactory`, reverted
- **LLM parse on frontend:** Hallucination handling spread across two layers → all validation moved to backend
- **LLM reslide:** Expensive, slow, untestable → pivoted to deterministic engine

### Impact of agent rules

`.cursor/rules/projectvision.mdc` loaded every session; prevented agent from adding "social media features" or "gamification streaks" — PRD alignment maintained.

---

## Current Status

**Status: MVP Complete ✅**

| Area | Status | Note |
|------|--------|------|
| **Week 1** — Auth & Capture | ✅ Complete | RLS verified |
| **Week 2** — AI Syllabus | ✅ Complete | Zod pipeline stable |
| **Week 3** — Adaptive Calendar | ✅ Complete | Unit tests passing |
| **Week 4** — Showcase & Publish | ✅ Complete | End-to-end flow tested |
| **Backend tests** | ✅ `npm test` passed | 3 test files |
| **Frontend build** | ✅ `npm run build` successful | Next.js 16 production |
| **Documentation** | ✅ Full `prodocs/` set | tech_stack, plan, design_system, progress |
| **Live environment** | ✅ Dev verified | Frontend `:3000` + Backend `:4000` |

### Delivered end-to-end flow

```
Sign up → URL Capture → AI Enrichment → One-Click Syllabus
  → Daily Schedule → Missed Day Reslide → Notes
    → Opt-in Publish → Public Showcase (/showcase/[slug])
```

### Known limitations (post-MVP)

- `prefers-reduced-motion` support not yet added
- Edge Function migration can be evaluated in Phase 2
- Vector DB / RAG integration out of scope
- Mobile sidebar responsive improvements may continue

### Recommended next steps (Phase 2)

1. Production deploy: Frontend (Vercel) + Backend (Railway/Render) + Supabase managed
2. Anti-Guilt metric: retention measurement after 2 consecutive missed days
3. Gap suggestion → one-click resource add loop
4. E2E test suite (Playwright) — publish and reslide happy path

---

*This log is the technical development record of The Adaptive Learning Ledger MVP sprint. It provides a transparent summary of the AI-assisted development process.*
