# MVP Strategy: The Adaptive Learning Ledger (Phase 1)

**Goal:** Validate the "Adaptive Engine" hypothesis with the simplest possible feature set.

---

## 1. MVP Feature Set ("The Lean Sprint")

### A. The "Inbox" & Capture
- **Web-based Link Saver:** A simple dashboard input where users paste URLs.
- **Manual Sorting:** Ability to create one "Target Sprint" folder.

### B. The AI Architect (V1)
- **One-Click Syllabus:** A button that sends folder links to GPT-4o-mini to return a 4-week sequential learning list.
- **Basic Time Blocking:** AI assigns a simple "Short/Medium/Long" duration to each item.

### C. The Adaptive Calendar
- **Daily Goal Setting:** User defines "I have 30 minutes a day."
- **Automatic Shift:** If a task isn't marked "Done," it moves to tomorrow, and the end-date of the 30-day sprint pushes back automatically.

### D. The Portfolio Lite
- **Public URL:** A basic, non-editable read-only view of current progress.
- **Social Metadata:** Optimized tags for professional sharing.

## 2. Technical Stack Recommendation
- **Framework:** Next.js (Tailwind CSS).
- **Database/Auth:** Supabase.
- **AI:** OpenAI API.

## 3. 4-Week Development Roadmap
- **Week 1:** Database schema and "Link Capture" UI.
- **Week 2:** Integration of LLM for Syllabus generation.
- **Week 3:** Logic for the "Adaptive Calendar" (The shifting end-date algorithm).
- **Week 4:** Public Portfolio page and "Share" functionality.

## 4. User Validation Metric
**The "Anti-Guilt" Test:** Do users continue using the app after missing 2 consecutive days because the AI removed the "I failed" stigma?
