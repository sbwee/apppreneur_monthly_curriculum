# The Adaptive Learning Ledger — MVP Development Plan

**Project:** The Adaptive Learning Ledger  
**Phase:** MVP — Phase 1 ("The Lean Sprint")  
**Duration:** 4 Weeks  
**Goal:** Validate the "Adaptive Engine" hypothesis with the smallest possible feature set — transforming information hoarding into structured curricula and a shareable Proof-of-Work portfolio.

**Success Metric (Anti-Guilt Test):** Do users continue using the app after missing 2 consecutive days? Does AI-assisted rescheduling remove the "I failed" stigma?

---

## Sprint Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| **Week 1** | Database schema + Link Capture UI | Auth, folder/resource CRUD, dashboard |
| **Week 2** | LLM syllabus generation | One-click syllabus, metadata enrichment |
| **Week 3** | Adaptive calendar engine | Daily goal, auto-reslide, velocity |
| **Week 4** | Public Portfolio + Share | Showcase page, publish flow, OG meta |

---

## Week 1 — Database Schema & Link Capture UI

**Sprint goal:** Stand up the core data model protected by RLS and the capture interface so users can register and save URLs into folders.

### User Stories

- [ ] As a user, I want to **sign up with email and password**, so that my learning data is tied to a secure account.
- [ ] As a user, I want to **see a dashboard after logging in**, so that I can manage saved resources from a single screen.
- [ ] As a user, I want to **create a folder called "Target Sprint"**, so that I can group links for a monthly learning sprint.
- [ ] As a user, I want to **add a resource by pasting or dragging a URL**, so that I can quickly capture YouTube, blog, or PDF links.
- [ ] As a user, I want to **see title and type information for saved resources**, so that I can meaningfully scan my inbox.

### Technical Tasks

#### Supabase & Backend

- [ ] Write the initial migration containing `profiles`, `folders`, `resources` tables (`20260512194500_initial_learning_ledger.sql`)
- [ ] Define the `auth.users` → `profiles` auto-create trigger
- [ ] Add Row Level Security (RLS) policies to all user tables (`user_id = auth.uid()`)
- [ ] Set up Express app skeleton: CORS, JSON parser, `/api` router, centralized error handler
- [ ] `requireAuth` middleware: Supabase JWT validation + `Authorization: Bearer` flow
- [ ] `GET/POST /api/folders` — list and create folder endpoints
- [ ] `GET/POST /api/resources` — list resources and add by URL
- [ ] `resourceKind.js` — URL heuristic classification (video, audio, reading, …)
- [ ] `GET /api/health` — Supabase connection status check

#### Frontend (Next.js)

- [ ] Set up Next.js App Router project structure (`app/`, `src/views/`, `src/components/`)
- [ ] Supabase client integration (`src/lib/supabase.ts`) and auth token management (`src/lib/auth.ts`)
- [ ] `LoginForm` + `AuthGuard` — login/signup and protected route flow
- [ ] `HomePage` dashboard skeleton: `Header`, `Sidebar`, `BucketList`
- [ ] `ResourceDropzone` — URL paste + drag-and-drop capture component
- [ ] `ResourcesCard` — folder-linked resource list and add UI
- [ ] `apiFetch()` generic HTTP client (`src/lib/api.ts`) — type-safe backend communication
- [ ] `homeApi.ts` / `resourceApi.ts` — folder and resource API client layer

#### AI Integration

- [ ] Add `ingest_status` (`pending` / `enriched` / `failed`) and `metadata jsonb` fields to `resources` table
- [ ] Add `OPENAI_API_KEY` placeholder to backend `.env.example` (prep for Week 2 enrichment)
- [ ] Set up queue infrastructure with `ingest_status: pending` after resource creation

**Week 1 Definition of Done:** A logged-in user can create a folder and save at least one URL; data is isolated by RLS; resources appear on the dashboard.

---

## Week 2 — LLM Syllabus Generation

**Sprint goal:** Analyze folder resources with GPT-4o-mini and convert them into a structured 4-week (30-day) learning plan.

### User Stories

- [ ] As a user, I want to **create a new curriculum**, so that I can generate a plan from resources in a sprint folder.
- [ ] As a user, I want to **generate an AI curriculum with one click**, so that scattered links are automatically arranged in a logical sequence.
- [ ] As a user, I want to **see estimated consumption and practice time per module**, so that I can realistically plan my daily schedule.
- [ ] As a user, I want to **see AI gap suggestions for missing concepts**, so that I can identify and fill holes in my curriculum.
- [ ] As a user, I want **my resources automatically summarized**, so that I can quickly understand what each link is about.

### Technical Tasks

#### Supabase & Backend

- [ ] Add `curricula`, `curriculum_items`, `syllabus_versions`, `notes`, `publish_settings` tables to migration
- [ ] `POST /api/curricula` — create curriculum (folder_id + title binding)
- [ ] `POST /api/curricula/:id/generate-structure` — syllabus generation endpoint
- [ ] `GET /api/curricula/:id` — curriculum detail (items, overview, gap_suggestions)
- [ ] `syllabusPersist.js` — persist LLM output as curriculum + items
- [ ] `GET/POST /api/resources/:id/enrich` — single-resource enrichment trigger
- [ ] `resourceEnrichmentRunner.js` — async enrichment queue processor
- [ ] `resourceFetch.js` + `youtubeMetadata.js` — URL content fetch layer

#### Frontend (Next.js)

- [ ] `CreateCurriculumPanel` — new curriculum creation form
- [ ] `WorkspacePage` — curriculum selection, detail loading, and generate flow
- [ ] `WorkspaceMainPanel` + `SectionsCard` — weekly/daily view of generated modules
- [ ] `GapSuggestionsCard` — AI gap suggestions card
- [ ] `GardenSpinner` — loading state during syllabus generation
- [ ] `workspaceApi.ts` — `generateCurriculumStructure`, `fetchCurriculumDetail` client functions
- [ ] `resourceMapper.ts` — backend resource DTO → UI model mapping

#### AI Integration

- [ ] OpenAI SDK integration (`openai` package, `createOpenAiClient`)
- [ ] `syllabusLlm.js` — full syllabus generation: system prompt + resource catalog + JSON output
- [ ] `syllabusPayload.js` — Zod schema `ledger.syllabus.v1` (items, overview, gap_suggestions, source_resource_ids)
- [ ] `normalizeLlmSyllabusJson()` — normalize LLM drift and skeleton fallback
- [ ] `resourceEnrichment.js` — `response_format: json_object` for title, summary, duration, content_kind
- [ ] `resourceMetadata.js` — enrichment output Zod validation
- [ ] `llmRuntimeEnv.js` — model (`gpt-4o-mini`), timeout (120s), token limits (`12_000` syllabus / `1_024` enrich)
- [ ] `OPENAI_MODEL` env support for upgrading to `gpt-4o`

**Week 2 Definition of Done:** User can generate a one-click syllabus from a folder with at least 2 enriched resources; plan displays in workspace with weekly modules, time estimates, and gap suggestions.

---

## Week 3 — Adaptive Calendar (Shifting End-Date Algorithm)

**Sprint goal:** Let users define a daily learning goal, automatically shift incomplete tasks forward, and dynamically extend the sprint end date.

### User Stories

- [ ] As a user, I want to **set my daily learning time (e.g. 30 min)**, so that the plan stays realistic for my life.
- [ ] As a user, I want to **see today's tasks in a calendar view**, so that I know clearly what to complete.
- [ ] As a user, I want to **mark a task as "Done"**, so that my progress is recorded.
- [ ] As a user, I want **missed days' tasks automatically deferred**, so that I can continue without feeling like I failed.
- [ ] As a user, I want to **see the sprint end date extend after deferrals**, so that I have a realistic completion timeline.
- [ ] As a user, I want to **customize sprint duration (7–90 days)**, so that I can adapt to short or long challenges.

### Technical Tasks

#### Supabase & Backend

- [ ] Add `schedule_assignments` and `velocity_snapshots` tables via migration (`20260514200000_phase4_schedule_velocity.sql`)
- [ ] Add `profile.daily_minutes_goal` field via migration (`20260530120000_profile_daily_minutes_goal.sql`)
- [ ] Add `curricula.sprint_days` field via migration (`20260531120000_curriculum_sprint_days.sql`)
- [ ] `schedulingEngine.js` — deterministic calendar engine: `spreadDayOffsets`, `itemToScheduledDate`, reslide algorithm
- [ ] `curriculaSchedule.js` — `POST bootstrap`, `GET range`, `POST reslide-missed` endpoints
- [ ] `PATCH /api/schedule-assignments/:id` — task status update (`planned` / `done` / `skipped` / `deferred`)
- [ ] `GET/PATCH /api/profile` — read/write daily minutes goal
- [ ] `schedulingEngine.test.js` — unit tests for reslide and date distribution

#### Frontend (Next.js)

- [ ] `ScheduleCard` — weekly/daily task list, status toggle, missed-day summary
- [ ] `DailyGoalSettings` — daily minute presets (15 / 30 / 45 / 60 min)
- [ ] `SprintDurationControl` / `SprintDurationSettings` — sprint day count setting
- [ ] `scheduleApi.ts` — `fetchScheduleRange`, `updateScheduleAssignment`, `reslideMissedSchedule`, `bootstrapSchedule`
- [ ] `WorkspacePage` — auto schedule bootstrap after syllabus + focus on first incomplete module
- [ ] `WorkspaceProgressCard` — completion percentage and sprint progress indicator
- [ ] Anti-guilt messaging: "Reslide" / dismiss prompt UI for missed days

#### AI Integration

- [ ] Persist `consumption_minutes` and `practice_minutes` on syllabus items from LLM output
- [ ] Separate schedule engine from LLM — date shifting only via deterministic `schedulingEngine.js` (cost and predictability)
- [ ] Velocity snapshot calculation — weekly completion rate (data collection for future sprint realism)

**Week 3 Definition of Done:** User can set daily goal and mark tasks; when at least 1 day is missed, tasks slide forward and sprint end date extends; entire flow runs without LLM calls.

---

## Week 4 — Public Portfolio & Share Functionality

**Sprint goal:** Let users opt in to convert their curriculum into a public showcase URL and serve a read-only portfolio page for professional sharing.

### User Stories

- [ ] As a user, I want to **publish my curriculum publicly**, so that I can showcase my learning journey as a portfolio.
- [ ] As a user, I want to **choose a custom slug for the public URL**, so that my share link is personal and memorable.
- [ ] As a user, I want **my published page to be read-only**, so that visitors can view the plan but not edit it.
- [ ] As a user, I want to **see weekly module progress on the showcase page**, so that my Proof-of-Work evidence is visible.
- [ ] As a user, I want to **copy the share link with one click**, so that I can quickly add it to LinkedIn or my CV.
- [ ] As a user, I want to **unpublish whenever I choose**, so that privacy control stays with me.

### Technical Tasks

#### Supabase & Backend

- [ ] `publish_settings` table: `is_published`, `public_slug`, `curriculum_id` (unique slug constraint)
- [ ] RLS: only owner can read/write publish settings; public endpoint uses service-role
- [ ] `curriculaPublish.js` — `GET/PUT publish settings` endpoints
- [ ] `showcasePublic.js` — `GET /api/public/:slug` (no auth, rate-limited)
- [ ] `showcaseAssembler.js` — assemble published curriculum + items + resources → public payload
- [ ] Slug validation: `[a-z0-9]+(-[a-z0-9]+)*`, max 120 characters
- [ ] `Cache-Control: public, max-age=60` — showcase endpoint caching

#### Frontend (Next.js)

- [ ] `PublishPanel` — publish toggle, slug editor, link copy, save
- [ ] `app/showcase/[slug]/page.tsx` — SSR public showcase route
- [ ] `ShowcasePage` — hero, weekly module cards, rationale, resource links
- [ ] `showcaseApi.ts` + `showcaseMapper.ts` — public payload → UI model
- [ ] `showcaseMetadata.ts` — Open Graph / social sharing meta tags
- [ ] `NoteEditor` — module-linked markdown notes (private workspace layer)
- [ ] Privacy-first UX: all data default `private`; publish is explicit opt-in panel

#### AI Integration

- [ ] Reflect LLM-generated `overview` and item `rationale` in showcase payload public view
- [ ] Do not show gap suggestions on showcase (MVP: only generated plan and progress — user privacy)
- [ ] No AI calls on public page — all content served from pre-persisted data (zero inference cost)

**Week 4 Definition of Done:** User can publish curriculum and get a public URL with custom slug; unauthenticated visitors can view showcase read-only; unpublish restores privacy.

---

## MVP Completion Criteria (Overall)

- [ ] End-to-end flow: Sign up → URL capture → AI syllabus → daily tracking → public showcase
- [ ] All user data protected by RLS; AI key only on backend
- [ ] LLM outputs validated with Zod; schedule logic is deterministic
- [ ] Monorepo structure: `apps/frontend` + `apps/backend` + `supabase/migrations`
- [ ] Basic test coverage: `schedulingEngine.test.js`, `syllabusPayload.test.js`

---

## Risks & Mitigation (Across Sprint)

| Risk | Week | Mitigation |
|------|------|------------|
| LLM hallucination / JSON format error | Week 2 | Zod schema + normalize + skeleton fallback |
| Auth token leakage | Week 1 | OpenAI key only in backend `.env` |
| Schedule drift (date inconsistency) | Week 3 | ISO date lib + unit tests + non-LLM engine |
| Public slug collision | Week 4 | DB unique constraint + client-side validation |
| High OpenAI cost | Week 2–3 | `gpt-4o-mini` default; token cap env vars |

---

*This plan is the user-story and technical-task breakdown of the 4-week Lean Sprint roadmap from MVP.md. Tasks are written to align one-to-one with the actual codebase implementation.*
