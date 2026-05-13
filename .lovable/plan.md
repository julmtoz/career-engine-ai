## Vision

Transform Aether OS from a cyberpunk "mission control" into a calm, light-first, consumer-grade AI career copilot — visually inspired by Jobright AI, Linear, Perplexity, Notion, and Arc.

The product should feel like an elite chief-of-staff that quietly delivers interviews — not an infrastructure dashboard.

---

## 1. New Design System (`src/styles.css`)

Replace the dark cobalt + phosphor cyan palette with a light-first system:

- **Background:** soft warm white `#FAFAF9` / pure `#FFFFFF` cards
- **Foreground:** near-black `#0A0A0A` with muted slate text `#6B7280`
- **Primary accent:** a single confident hue (Linear-style indigo `#5B5BD6` OR Jobright green `#16A34A` — recommend indigo for premium/trust)
- **Borders:** hairline `rgba(0,0,0,0.06)`
- **Radius:** soften to `0.75rem` (12px) for cards, `9999px` for pills
- **Typography:** keep Inter, drop the uppercase mono tracking everywhere, introduce a serif (Instrument Serif or similar) only for hero/briefing headlines
- **Shadows:** replace neon glow with soft elevation `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.08)`
- **Remove:** `.scanlines`, `.signal-grid`, `.grid-bg`, `.glow-accent`, `.text-glow`, `.animate-scan`, `.animate-pulse-ring`, body radial gradients, noise texture
- **Add:** `.card` (white surface), `.surface-soft` (off-white), gentle motion tokens
- Keep dark mode as an opt-in `.dark` variant (not default)

## 2. Information Architecture — collapse 23 nav items into 5

Current top nav has 23 items exposing every backend concept. New nav:

| New top-level | Merges (current routes) |
|---|---|
| **Today** (default) | `/dashboard` + `/observability` + AI morning briefing |
| **Opportunities** | `/feed` + `/jobs` + `/companies` + `/sources` + `/intake` |
| **Pipeline** | `/pipeline` + `/approvals` + `/follow-ups` + `/outreach` + `/recruiters` |
| **Prepare** | `/prep` + `/resume` + `/resumes` + `/strategist` + `/copilot` |
| **Insights** | `/analytics` + `/conversion` |

Secondary (in avatar menu): Profile, Automation settings, Packages, Feedback, Admin, Launch, Demo. Old route URLs continue to work; they just render inside the new shell.

## 3. New `AppShell`

- Slim top bar: logo (wordmark only, mixed case "Aether"), 5 nav items centered, avatar right
- Remove the always-on "Fleet online" status pill and the floating "Command agent ⌘K" pill at the bottom
- Replace with a subtle `⌘K` hint inside a centered search/ask bar at the top ("Ask Aether anything…") — Perplexity-style
- Persistent AI assistant: small floating chat button bottom-right (calm, not glowing)

## 4. Redesigned key screens (in priority order)

### a) `/` (`Today`) — new homepage after login
- Greeting + serif headline: "Good morning, Jorge."
- AI **Morning Briefing** card: 3-bullet summary of what happened overnight + "3 next actions" CTAs
- Outcome metrics row: Interviews this week · Replies · Applications — large numbers, no neon
- "Top opportunities for you today" — 3 opportunity cards with match %, salary, why-it-fits, one-click Apply
- Stateful empty states with AI suggestions

### b) `/opportunities` (Feed redesign)
- Clean 2-column: filters left, opportunity cards right
- Each card: company logo, role, salary, location, AI match score (subtle ring, not neon), "Why this fits you" AI snippet, primary CTA "Apply with AI"

### c) `/pipeline`
- Linear-style kanban or compact list with stages: Saved → Applied → Replied → Interviewing → Offer
- Inline AI next-action chips ("Send follow-up", "Prep for screen Tuesday")

### d) `/prepare`
- Tabs: Resume · Interview prep · Strategy
- Resume editor: clean Notion-style document
- Interview prep: AI-generated mock questions per scheduled interview

### e) `/insights`
- Outcome-first: Interviews / week (hero chart), Reply rate, Time-to-interview
- Remove all "telemetry" / agent observability framing

### f) `/login` + `/onboarding`
- Single-column, centered, generous whitespace, serif headline, one CTA, social proof line

## 5. Component refresh

- `mission-control.tsx`, `agent-stream.tsx`, `match-ring.tsx`, `signature.tsx`, `job-card.tsx` — restyle to light surfaces, soft shadows, remove scanlines/glow/orbit. Some may be retired (e.g. agent-stream replaced by simple "Recent activity" list).
- New components: `MorningBriefing`, `OutcomeStat`, `OpportunityCard`, `AskBar`, `AssistantDock`, `EmptyStateWithSuggestion`.

## 6. Out of scope for this pass

- No backend/server-function changes — same data, new presentation
- No copy rewrite for every screen yet (focus on shell + Today + Opportunities + Pipeline + Insights + login/onboarding); other routes inherit the new tokens automatically and get cleaned up incrementally
- Keep all existing routes reachable so nothing 404s

---

## Technical approach

1. Rewrite `src/styles.css` tokens + remove cyberpunk utilities
2. Rewrite `src/components/app-shell.tsx` (5-item nav, AskBar, AssistantDock)
3. Rewrite `src/routes/index.tsx` as the new `Today` landing
4. Add new components in `src/components/` (briefing, outcome-stat, opportunity-card, ask-bar, assistant-dock)
5. Reskin `/feed`, `/pipeline`, `/analytics`, `/prep`, `/login`, `/onboarding` as the priority screens
6. Lightly restyle remaining routes by removing dark utility classes; deeper redesign in a follow-up pass

I'll execute this end-to-end if you approve. If you'd rather pick one accent color first (indigo vs. Jobright green vs. something else), say the word and I'll lock that in before starting.