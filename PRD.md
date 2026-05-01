# Product Requirements Document (PRD): The Adaptive Learning Ledger

**Version:** 1.0  
**Status:** Draft

---

## 1. Executive Summary
**Vision:** To bridge the gap between "Information Hoarding" and "Knowledge Mastery." The Adaptive Learning Ledger is a hybrid Personal Learning Environment (PLE) and Portfolio tool that transforms fragmented web resources into structured, AI-sequenced "Monthly Curriculums" that double as verifiable "Proof of Work."

## 2. Target Audience
1.  **The Self-Directed Learner:** Individuals taking "30-day challenges" or learning via YouTube/Substack/Blogs.
2.  **App-preneurs & Developers:** Professionals in fast-moving fields who need to document their upskilling.
3.  **Career Pivoters:** People transitioning into new sectors needing to show recruiters their learning trajectory.

## 3. Core Functional Requirements

### 3.1 Multi-Modal Resource Hub (The "Input")
- **Capture Engine:** A system to save URLs, PDF links, and media snippets.
- **Metadata Enhancement:** Automatic scraping of resource titles, durations, and summaries using LLM-based parsing.

### 3.2 AI-Dynamic Planning (The "Architect")
- **Syllabus Generation:** An AI agent that analyzes a folder of raw links and organizes them into a logical, sequential curriculum.
- **Cognitive Load Estimation:** AI calculates the time required for consumption and "active practice" for each item.
- **Gap Identification:** AI suggests 1-2 complementary resources if a critical concept is missing.

### 3.3 The Auto-Adaptive Engine (The "Flow")
- **Dynamic Rescheduling:** A "sliding window" calendar. If a user misses a day or adds a new resource, the engine recalibrates the completion date automatically.
- **Velocity Tracking:** Measures "Resources Completed per Week" to adjust future goal realism.

### 3.4 Active Learning Layer (The "Work")
- **Contextual Note-Taking:** A Markdown editor tethered to specific resources.
- **Proof-of-Work Snippets:** Ability to flag specific notes as "Public Assets."

### 3.5 Dual-State Visibility (The "Ledger")
- **Workspace Mode:** A private, "low-pressure" environment for messy learning.
- **Showcase Mode:** A single-toggle public page displaying a polished version of the curriculum and progress.

## 4. Technical Constraints
- **Stack:** Optimized for web-first development (Next.js/Supabase).
- **AI Integration:** Heavy reliance on LLM APIs (GPT-4o or Claude 3.5).
- **Data Privacy:** User learning data is private by default.

## 5. Success Metrics
- **Completion Rate:** % of users who finish a started "Monthly Curriculum."
- **Recalibration Frequency:** Number of times the AI successfully adjusts a schedule to keep a user active.
