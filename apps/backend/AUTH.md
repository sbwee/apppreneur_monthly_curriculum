# Backend auth and Supabase keys

This app uses **Supabase** for Postgres, Auth, and (later) Storage. Your backend needs to know **which key** to use for each job.

## Keys (keep all of them secret in `.env`)

| Variable | Who it is for | Row Level Security (RLS) |
|----------|----------------|---------------------------|
| `SUPABASE_ANON_KEY` | Browser or server calls that should act **as the logged-in user** | **Enforced** — users only see rows policies allow |
| `SUPABASE_SERVICE_ROLE_KEY` | **Trusted server only** (this Express app, scripts you run) | **Bypassed** — can read/write everything; never ship to the client |

Also set `SUPABASE_URL` for both.

## Two patterns (pick one per route)

1. **User-scoped (recommended default)**  
   The frontend sends `Authorization: Bearer <access_token>` from Supabase Auth. The backend creates a Supabase client with the **anon key** and that JWT. Queries run **as that user**, so **RLS protects you** if you forget a `user_id` filter.

2. **Admin / maintenance**  
   The backend uses the **service role** client for rare jobs (migrations, batch fixes, trusted ingestion). Every query must still be **careful**: RLS does not apply, so bugs can touch all users’ data.

## Practical rule

- Anything tied to a **user’s curriculum, notes, or resources** → prefer **user JWT + anon key** on the server.  
- Anything that truly must see **all rows** → service role, locked behind strict checks and logging.

## Where this is wired in code

- Environment loading: [`src/config/env.js`](src/config/env.js)  
- Service role client: [`src/config/supabase.js`](src/config/supabase.js) (`createSupabaseAdmin`)  
- User-scoped helper: `createSupabaseWithUserAccessToken` in the same file (anon key + `Authorization` header)

## Applying the database schema

SQL migrations live under [`../../supabase/migrations/`](../../supabase/migrations/) at the **repo root** (same level as `apps/`). Run them from the Supabase **SQL Editor** (paste the file), or use the Supabase CLI (`supabase db push`) after linking your project.

After the first migration, new sign-ups get a row in `public.profiles` automatically via the `on_auth_user_created` trigger.

## Resource and folder APIs (Phase 2)

Protected routes expect a Supabase session access token:

```http
Authorization: Bearer <supabase_access_token>
```

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/folders` | List your folders |
| `POST` | `/api/folders` | Body: `{ "name": "..." }` |
| `GET` | `/api/resources` | Optional query `folder_id` |
| `POST` | `/api/resources` | Body: `{ "url": "https://...", "folder_id": null, "kind": "optional" }` |
| `GET` | `/api/resources/:id` | |
| `PATCH` | `/api/resources/:id` | Partial updates |
| `DELETE` | `/api/resources/:id` | |
| `POST` | `/api/resources/:id/enrich` | Calls OpenAI; requires `OPENAI_API_KEY` |

### Curricula and syllabus (Phase 3)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/curricula` | List your curricula |
| `POST` | `/api/curricula` | `{ "title", "month_start"?, "folder_id" \| "resource_ids", "auto_enrich"? }` — exactly one of `folder_id` or `resource_ids`; creates curriculum, runs LLM syllabus, stores `syllabus_versions` + `curriculum_items` |
| `GET` | `/api/curricula/:id` | Curriculum, latest syllabus version, ordered items |
| `POST` | `/api/curricula/:id/syllabus/patch` | `{ "resource_ids": [...] }` — merge new resources into existing plan (new version) |
| `POST` | `/api/curricula/:id/syllabus/generate` | `{ "auto_enrich"? }` — rebuild from folder resources, or from last syllabus resource set if `folder_id` is null |

Syllabus JSON uses schema id `ledger.syllabus.v1` (see `src/schemas/syllabusPayload.js`).

### Schedule and velocity (Phase 4)

Apply migration [`../../supabase/migrations/20260514200000_phase4_schedule_velocity.sql`](../../supabase/migrations/20260514200000_phase4_schedule_velocity.sql) in Supabase **after** the initial ledger schema [`../../supabase/migrations/20260512194500_initial_learning_ledger.sql`](../../supabase/migrations/20260512194500_initial_learning_ledger.sql). Phase 4 references `public.curricula` and `public.curriculum_items`. If you see errors like `relation "public.curricula" does not exist`, the ledger migration was not applied (or an older file like `apps/backend/phase0_schema.sql` was used instead — that script defines `curriculums`, not `curricula`, and does not match this backend).

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/curricula/:id/schedule/bootstrap` | Body optional `{ "start_date"?: "YYYY-MM-DD" }`. Uses `curriculum.month_start` or today if omitted. Query `?force=1` replaces existing rows. |
| `GET` | `/api/curricula/:id/schedule?from=&to=` | Calendar window; includes nested `curriculum_item` + `resource` |
| `POST` | `/api/curricula/:id/schedule/reslide` | Body `{ "missed_date", "shift_days"? }` — slides **planned** work on/after that date forward |
| `PATCH` | `/api/schedule-assignments/:id` | `{ "status"?, "scheduled_date"? }` — marking `done` sets `completed_at` |
| `POST` | `/api/curricula/:id/velocity/snapshot` | Body optional `{ "period_days"?: number }` (default 7); stores rollup in `velocity_snapshots` |
| `GET` | `/api/curricula/:id/velocity` | Recent snapshots (up to 60) |

Optional env: `OPENAI_MODEL` (defaults to `gpt-4o-mini`).

### Notes (Phase 5)

Markdown notes are tied to a **resource**; optionally scoped to a **curriculum_item**. `is_public_asset` flags content intended for a future public showcase (showcase filtering is Phase 6).

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/notes?resource_id=<uuid>&curriculum_item_id=<uuid>?` | List notes for a resource |
| `POST` | `/api/notes` | `{ "resource_id", "curriculum_item_id"?, "body_markdown"?, "is_public_asset"? }` |
| `GET` | `/api/notes/:id` | |
| `PATCH` | `/api/notes/:id` | `{ "body_markdown"?, "is_public_asset"?, "curriculum_item_id"? }` — use `null` on `curriculum_item_id` to clear the link |
| `DELETE` | `/api/notes/:id` | |

### Showcase / public portfolio (Phase 6)

Public read uses the **service role** Supabase client only inside `GET /api/public/:slug` (never sent to browsers). Slugs are lowercase `a-z`, `0-9`, and hyphens.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/curricula/:id/publish` | Current `publish_settings` (or defaults) for the owner |
| `PUT` | `/api/curricula/:id/publish` | `{ "is_published", "public_slug"? }` — when publishing, set `public_slug` on first publish or omit to keep the saved slug; unpublishing clears the slug |
| `GET` | `/api/public/:slug` | **No auth.** Returns published curriculum summary, syllabus overview/items, resources, and **only** notes with `is_public_asset: true` |
