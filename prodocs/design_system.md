# The Adaptive Learning Ledger — Design System

**Project:** The Adaptive Learning Ledger (Curio)  
**Product Psychology:** Anti-Guilt  
**Technical Foundation:** Tailwind CSS v4 + `design-system.css` CSS variables  
**Source Files:** `apps/frontend/app/globals.css`, `apps/frontend/src/styles/design-system.css`

---

## 1. Design Philosophy & Tone

### 1.1 North Star: Anti-Guilt Design

The Adaptive Learning Ledger offers a learning environment that **does not create pressure**, unlike traditional productivity apps. The design language is built on these principles:

| Principle | Design Expression |
|-----------|-------------------|
| **Flexibility > Discipline punishment** | Missed days shown via soft green "reslide" panel, not red alarms |
| **Progress > Perfection** | Completion percentage in celebratory tone; incomplete tasks labeled "deferred" not "failed" |
| **Calm focus** | Low-contrast neutral surfaces, soft shadows, no social-media-style notifications |
| **Deep work** | Minimal chrome, generous spacing (`--pg-space-section-lg: 2rem`), non-distracting sidebar |

**Prohibited:**
- Bright red deadline countdowns
- Guilt-inducing messages like "X-day streak broken!"
- Aggressive animations or blink effects
- High-contrast dark patterns

**Preferred copy:**
- "Plan adjusted — you're still on the path" (after reslide)
- "All caught up" (completion celebration)
- "Deferred" / "Skipped" (warm amber tone, not red)

### 1.2 Two Modes: Workspace vs Showcase

The application maintains a **sharp yet harmonious** visual split between two identities:

```
┌─────────────────────────────────────────────────────────────────┐
│  WORKSPACE MODE                    │  SHOWCASE MODE               │
│  (Private · Messy OK)              │  (Public · Polished)         │
├────────────────────────────────────┼──────────────────────────────┤
│  Flat parchment canvas (#faf8f5) │  Gradient hero background    │
│  Sidebar + multi-panel layout      │  Single column, centered      │
│  Interactive cards, editors        │  Read-only, static cards    │
│  Pill buttons, chip selectors      │  Serif headings, meta pills   │
│  Botanical growth icons            │  Weekly arc visualization     │
│  Publish panel (opt-in)            │  Proof-of-Work showcase       │
└────────────────────────────────────┴──────────────────────────────┘
```

| Attribute | Workspace | Showcase |
|-----------|-----------|----------|
| **Purpose** | Daily learning, note-taking, planning | Portfolio sharing, hiring proof |
| **Layout** | `workspace-grid` — 2 columns (main + sidebar) | `showcase-shell` — max-width container, centered |
| **Background** | Flat `--pg-canvas` | `linear-gradient` parchment → sage |
| **Heading font** | Georgia serif (panel headings) | Georgia serif (hero, section title) |
| **Body font** | Geist Sans | Geist Sans |
| **Interaction** | Toggle, checkbox, drag-drop | Link clicks only |
| **Shadow** | `--pg-shadow-sm` (subtle) | `0 14px 34px` (more dramatic showcase) |

### 1.3 Visual Metaphor: Botanical Growth

**Botanical growth stages** (Sprout → Leaf → Trees) replace progress bars. This metaphor:
- Frames learning as "cultivation"
- Softens numerical pressure
- Supported by `BotanicalGrowthIcon` + Lucide icons (`text-emerald-800`)

### 1.4 Spacing & Surface System

All workspace cards share common surface tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--pg-radius-surface` | `1.25rem` (20px) | Card corners |
| `--radius-pill` | `999px` | Buttons, chips, inputs |
| `--pg-space-section` | `1.5rem` | Intra-card section spacing |
| `--pg-space-section-lg` | `2rem` | Grid column gap |
| `--pg-shadow-sm` | Very light forest tint | Elevated cards |
| `.pg-elevated-surface` | White + border + shadow | Standard panel class |

---

## 2. Color Palette

Colors are synchronized between the Tailwind `@theme inline` block in `globals.css` and CSS variables in `design-system.css`.

### 2.1 Primary Token Table

| Role | CSS Variable | Hex | Tailwind Usage |
|------|--------------|-----|----------------|
| **Primary (Brand Forest)** | `--color-brand-forest` | `#2d4a3e` | `text-[--color-brand-forest]` or near `text-emerald-950` |
| **Primary CTA (Accent)** | `--color-brand-accent` | `#a64444` | `.btn-primary`, `.note-save-btn` |
| **Background (Canvas)** | `--pg-canvas` / `--background` | `#faf8f5` | `bg-[--pg-canvas]` |
| **Surface Elevated** | `--pg-elevated` | `#ffffff` | Card backgrounds |
| **Surface Secondary** | `--color-surface-2` | `#f5f2ed` | Secondary surfaces |
| **Ink Strong** | `--color-ink-strong` | `#2d4a3e` | Headings and body text |
| **Ink Muted** | `--color-ink-muted` | `#55645d` | Descriptions, captions |
| **Border Soft** | `--color-border-soft` | `#d8d8d1` | Input and card borders |
| **Border Elevated** | `--pg-border-elevated` | `rgba(45,74,62,0.09)` | `--color-border-soft` Tailwind alias |

### 2.2 Success & Progress (Calming Greens)

The core of the anti-guilt palette — success and progress expressed through **natural tones**:

| Role | Hex | Usage |
|------|-----|-------|
| **Success Surface** | `#dcebe3` | Active chip, completed checkbox, done badge |
| **Success Ink** | `#446d5d` | Success messages, feedback |
| **Sage Mid** | `#4a6b5c` | Eyebrow label, toggle hint |
| **Sage Light** | `#aac7bb` | Focus ring, checkbox border |
| **Mint Border** | `#8ec3b2` | Secondary button border |
| **Today Highlight** | `rgba(220,235,227,0.45)` | `.schedule-today-highlight` background |
| **Sidebar Active** | `#a3c0b0` | Active navigation chip |

```css
/* Focus ring — standard on all inputs */
box-shadow: 0 0 0 4px rgba(170, 199, 187, 0.26);
border-color: #aac7bb;
```

### 2.3 Neutral & Calming Tones (Stress-Reducing)

| Role | Hex | Usage |
|------|-----|-------|
| **Warm Parchment** | `#f8f6f1` | Resource item, editor surface |
| **Soft Linen** | `#f7f5f0` | Curriculum chip, dropzone |
| **Muted Stone** | `#ece8df` | Inner card border |
| **Warm Gray Text** | `#6b7f73` | Eyebrow, stage label |
| **Deferred Amber** | `#f3ead5` / `#8b5a2b` | Deferred tasks — warm, not alarming |
| **Soft Error** | `#9a504a` | Error messages — earthy red, not `#ff0000` |

### 2.4 Mode-Specific Colors

**Workspace gradient (caught-up celebration):**
```css
background: linear-gradient(145deg, #f7fbf8 0%, #ffffff 55%, #fbf8f2 100%);
```

**Showcase hero gradient:**
```css
background: linear-gradient(180deg, #faf8f5 0%, #f3efe6 42%, #eef4f0 100%);
```

**Landing ocean (marketing only):**
```css
/* Soft sky — not carried into workspace */
linear-gradient(180deg, #abb8bc → #f4ead8)
```

### 2.5 Tailwind v4 `@theme` Mapping

Tailwind tokens defined in `globals.css`:

```css
@theme inline {
  --color-background: #faf8f5;
  --color-foreground: #2d4a3e;
  --color-canvas: #faf8f5;
  --color-elevated: #ffffff;
  --color-ink-strong: #2d4a3e;
  --color-ink-muted: #55645d;
  --color-border-soft: rgba(45, 74, 62, 0.09);
  --shadow-pg-sm: 0 1px 2px rgba(45, 74, 62, 0.04), 0 4px 14px rgba(57, 65, 58, 0.06);
  --radius-pg-surface: 1.25rem;
  --spacing-section: 1.5rem;
  --spacing-section-lg: 2rem;
}
```

**Example Tailwind usage:**
```html
<div class="bg-canvas text-ink-strong rounded-[--radius-pg-surface] shadow-pg-sm p-[--spacing-section]">
  ...
</div>
```

### 2.6 Contrast & Accessibility Notes

- Primary text (`#2d4a3e`) on parchment canvas (`#faf8f5`) meets WCAG AA
- Muted text (`#55645d`) for secondary information only; not used on critical CTAs
- Accent CTA (`#a64444`) provides sufficient contrast with white text
- Dark mode out of MVP scope; `prefers-color-scheme: dark` override preserves light theme

---

## 3. Typography

### 3.1 Font Families

| Role | Font | Source | Usage |
|------|------|--------|-------|
| **Sans (Body)** | Geist Sans | `next/font/google` → `--font-geist-sans` | UI text, forms, schedule items |
| **Serif (Display)** | Georgia, "Times New Roman", serif | System font | Panel headings, hero, brand |
| **Mono (Editor)** | Geist Mono | `--font-geist-mono` | Markdown note editor |
| **Brand** | Georgia Bold | `.brand-mark` | Logo, landing mark |

```tsx
// layout.tsx
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
```

### 3.2 Typography Scale

| Level | Class / Style | Size | Font | Color |
|-------|---------------|------|------|-------|
| **Hero (Showcase)** | `.showcase-title` | `clamp(2.2rem, 5vw, 3.6rem)` | Georgia | `#1f2b24` |
| **Page Title (Workspace)** | `.workspace-note-title` | `clamp(1.65rem, 2.6vw, 2.7rem)` | Georgia | `#2d4a3e` |
| **Panel Heading** | `.utility-heading` | `1.8rem` | Georgia | `#253a31` |
| **Card Title** | `.workspace-progress-title` | `clamp(1.15rem, 2vw, 1.45rem)` | Georgia | `#2d4a3e` |
| **Section Title (Showcase)** | `.showcase-section-title` | `1.85rem` | Georgia | `#253a31` |
| **Body** | `body` / `.workspace-text` | `0.96–1rem` | Geist Sans | `#26362f` |
| **Lead / Overview** | `.showcase-overview` | `1.08rem`, line-height 1.7 | Geist Sans | `--color-ink-muted` |
| **Caption** | `.schedule-card-lead` | `0.88rem` | Geist Sans | `--color-ink-muted` |
| **Eyebrow** | `.workspace-progress-eyebrow` | `0.72rem`, letter-spacing `0.12em`, uppercase | Geist Sans | `#6b7f73` |
| **Badge / Status** | `.schedule-status` | `0.68rem`, uppercase | Geist Sans | Per status |
| **Mono Input** | `.note-markdown-input` | `0.88rem`, line-height 1.65 | Geist Mono | `#26362f` |

### 3.3 Typography Rules

1. **Serif for display only** — Use Geist Sans on form labels, buttons, and status badges
2. **Eyebrow pattern** — Small uppercase label before sections (`0.72rem`, `letter-spacing: 0.12em`, `#6b7f73`)
3. **Line-height** — Body text minimum `1.5`; overview/lead text `1.65–1.75`
4. **Italic lead** — Workspace editor opening paragraph: `.workspace-lead` (Georgia, 1.5rem, italic)
5. **Tabular nums** — Progress percentages: `font-variant-numeric: tabular-nums`
6. **Responsive headings** — Fluid scaling via `clamp()`; avoid fixed `text-4xl`

---

## 4. UI Components & Rules

### 4.1 Buttons

#### Primary (`.btn-primary`)

| Property | Value |
|----------|-------|
| Background | `#a64444` (`--color-brand-accent`) |
| Text | `#ffffff`, `font-weight: 600` |
| Border-radius | `999px` (pill) |
| Padding | `0.88rem 1rem` |
| Shadow | `0 8px 20px rgba(166, 68, 68, 0.2)` |
| Hover | `translateY(-1px)` |
| Disabled | `opacity: 0.7`, `cursor: not-allowed` |

**Usage:** Auth submit, note save (`.note-save-btn`). Primary irreversible actions in workspace.

#### Secondary (`.btn-secondary`)

| Property | Value |
|----------|-------|
| Background | `#ffffff` |
| Border | `1px solid #8ec3b2` |
| Text | `--color-ink-strong` |
| Hover | `translateY(-1px)` |

**Usage:** Secondary actions, cancel, alternative paths.

#### Forest Action (`.schedule-reslide-primary`, `.workspace-fab`)

| Property | Value |
|----------|-------|
| Background | `#2d4a3e` |
| Text | `#ffffff` |

**Usage:** Adaptive reschedule confirmation, FAB. "Continue" signal in anti-guilt flow — not accent red.

#### Ghost / Chip Action (`.daily-goal-chip`, `.schedule-plant-btn`)

| Property | Value |
|----------|-------|
| Default | White surface, `#d8e6dc` border |
| Active | `#dcebe3` surface, `#2d4a3e` border and text |
| Hover | `translateY(-1px)`, `#f5faf7` surface |

**Accessibility rules (all buttons):**
- Minimum tap target: `44×44px` (achieved via padding on pill buttons)
- `:focus-visible` — same sage focus ring as inputs
- On `disabled`, only opacity changes; element stays in DOM
- Icon-only buttons require `aria-label` (`.icon-btn`, `.schedule-check`)

---

### 4.2 Link Input Cards (Resource Dropzone)

**Component:** `ResourceDropzone` → `.resource-dropzone`

| State | Appearance |
|-------|--------------|
| **Default** | `2px dashed #d7ccbb`, surface `#fbf9f4`, radius `1.2rem` |
| **Drag Active** | Border `#8b5a2b`, surface `#f6f1e8` — warm amber, not alarm red |
| **Title** | Georgia serif, `1.35rem`, `#2c3c33` |
| **Description** | `0.92rem`, `--color-ink-muted` |

**Structure:**
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  Add a learning resource               │
│  Paste a URL or drag a link here       │
│                                        │
│  [ https://...                    ]    │
│  [ Add Resource ]                      │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

**Rules:**
- Input: `.field-input` — pill radius, sage focus ring
- Submit: `.btn-primary` + `.resource-dropzone-submit` (`width: auto`)
- Drag-drop: `text/uri-list` and `text/plain` extraction
- Error messages: `.auth-feedback-invalid` tone (`#9a504a`), inline hint not modal/toast
- During submit: `isSubmitting` → button `disabled`, dropzone interaction locked

---

### 4.3 Calendar View (Schedule Card)

**Component:** `ScheduleCard` → `.schedule-card`

#### Hierarchy

```
PanelHeading (Calendar icon)
├── schedule-card-lead (muted description)
├── schedule-today-highlight (today emphasis)
│   └── schedule-today-item + schedule-check
├── schedule-day-groups (day groups)
│   └── schedule-day-heading (uppercase label)
│       └── schedule-item (task row)
└── schedule-reslide-panel (missed days — anti-guilt)
    ├── schedule-reslide-eyebrow
    ├── schedule-reslide-copy (non-judgmental copy)
    └── schedule-reslide-primary / schedule-reslide-secondary
```

#### Task Row (`.schedule-item`)

| Element | Style |
|---------|-------|
| Container | White surface, `#ece8df` border, `0.95rem` radius |
| Checkbox | `.schedule-check` — `1.35rem` circle, `#aac7bb` border |
| Done state | Surface `#f5f8f5`, text `opacity: 0.62`, soft strikethrough |
| Status badge | Pill, uppercase `0.68rem` |

#### Status Color Codes

| Status | Background | Text | Psychology |
|--------|------------|------|------------|
| `planned` | `#eef4f0` | `#4a6b5c` | Neutral, pending |
| `done` | `#dcebe3` | `#2d4a3e` | Calm success |
| `deferred` | `#f3efe6` | `#7a7268` | Warm neutral — no guilt |
| `skipped` | `#f3efe6` | `#7a7268` | Intentional skip, no penalty |

#### Today Highlight (`.schedule-today-highlight`)

- Background: `rgba(220, 235, 227, 0.45)` — unobtrusive sage
- Label: "Today" — `0.72rem` uppercase, `#4a6b5c`
- Red "overdue" banner **not used**

#### Reslide Panel (Anti-Guilt Core)

- Gradient surface: parchment → sage (`#fdfbf7` → `#e6f1ea`)
- Copy tone: informative, non-judgmental ("We can shift unfinished items forward")
- Primary action: forest green (`.schedule-reslide-primary`), not accent red
- Secondary: dismiss / "Not now" — close without pressure

**Accessibility:**
- `.schedule-check` → `button` element, `aria-pressed` or `aria-label="Mark as done: {title}"`
- Day headings grouped with semantic `h3` or `aria-labelledby`
- Status badges read in full via `aria-label`

---

### 4.4 Mode Switch (Toggle / Switch)

Three toggle patterns exist in the application:

#### A. Publish Switch (`.publish-switch`)

**Component:** `PublishPanel` — gateway from Workspace to Showcase mode

| State | Track | Knob |
|-------|-------|------|
| Off | `#c9d9cf` | Left, white knob |
| On | `#2d4a3e` | Right (`translateX(1.08rem)`) |

```
Off:  (○    )  Private workspace
On:   (    ○)  Public showcase
```

**Rules:**
- `<button role="switch" aria-checked={isPublished}>` semantics
- `.publish-toggle-label` + `.publish-toggle-hint` (muted description) beside toggle
- Slug field editable only when publish is ON
- Async save → switch `disabled` during `isSaving`

#### B. Daily Goal Chips (`.daily-goal-chip`)

Segmented control pattern — chips styled as radio buttons:

| State | Style |
|-------|-------|
| Default | White, `#d8e6dc` border |
| Active | `#dcebe3` surface, `#2d4a3e` border + text |
| Preset values | 15 / 30 / 45 / 60 minutes |

**Rules:**
- Single selection; active chip has `aria-pressed="true"`
- Save feedback — error `#9a504a`, success `--color-brand-forest`

#### C. Note Panel Tabs (`.note-panel-tab`)

Edit / Preview mode switch:

| State | Style |
|-------|-------|
| Container | Pill wrapper, `#d8e6dc` border |
| Active tab | `#dcebe3` surface, `#2d4a3e` text |
| Inactive | Transparent, `#55645d` text |

#### D. Visibility Toggle (`.visibility-toggle`)

Note public/private indicator — decorative knob using same sage/forest palette as publish switch.

### 4.5 Shared Panel Structure

All workspace cards follow the same anatomy:

```html
<section class="[card-type]-card">       <!-- pg-elevated-surface tokens -->
  <h2 class="utility-heading flex items-center gap-2">
    <WorkspaceIcon icon={LucideIcon} />  <!-- text-emerald-800, h-5 w-5 -->
    <span>Panel Title</span>
  </h2>
  <p class="[card-type]-lead">...</p>    <!-- 0.88rem, ink-muted -->
  <!-- content -->
</section>
```

**Icon rule:** Lucide React, `workspaceIconClass` = `h-5 w-5 text-emerald-800`; decorative icons use `aria-hidden="true"`.

### 4.6 Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `≤768px` | Sidebar static, `margin-left: 0` |
| `≤1024px` | Home grid single column |
| `≤1180px` | Workspace grid single column; sticky sidebar removed |

### 4.7 Motion & Feedback

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover lift | `120ms` | `ease` |
| Toggle slide | `160ms` | `ease` |
| Focus ring | `120ms` | `ease` |
| Progress meter | `400ms` | `ease` |
| Spinner | `0.95s` | `linear infinite` |

**Rule:** Animations are informative, not attention-grabbing. Transitions should be constrained for `prefers-reduced-motion: reduce` in a future release (MVP+).

---

## Appendix: Component → CSS Class Quick Reference

| Component | Primary CSS Classes |
|-----------|---------------------|
| `ResourceDropzone` | `.resource-dropzone`, `.field-input`, `.btn-primary` |
| `ScheduleCard` | `.schedule-card`, `.schedule-check`, `.schedule-reslide-panel` |
| `PublishPanel` | `.publish-panel`, `.publish-switch`, `.publish-slug-input-wrap` |
| `DailyGoalSettings` | `.daily-goal-card`, `.daily-goal-chip` |
| `NoteEditor` | `.note-panel`, `.note-panel-tab`, `.note-markdown-input` |
| `ShowcasePage` | `.showcase-shell`, `.showcase-hero`, `.showcase-week-card` |
| `WorkspaceProgressCard` | `.workspace-progress-card`, `.workspace-progress-botanical` |

---

*This design system must stay synchronized with `design-system.css` and `globals.css`. When adding new components, use existing tokens first; add new colors to the palette table before defining them.*
