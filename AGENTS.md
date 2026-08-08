# AGENTS.md

Single source of truth for project guidance, read by every coding agent (Claude Code imports it via CLAUDE.md; Codex reads it directly). Edit shared guidance HERE, not in CLAUDE.md — CLAUDE.md holds only Claude-specific additions.

**Sync check (any agent, whenever either file is edited or committed):** no copying is ever needed — CLAUDE.md imports this file live via `@AGENTS.md`, and Codex reads it directly. The only failure mode is misplaced content. Before committing a change to CLAUDE.md, verify it still starts with `@AGENTS.md` and contains nothing Codex would need; if shared guidance has crept in, move it here. Never duplicate a rule into both files.

## Project state

Local development only. Do not create, configure, or deploy to a production
platform until the user explicitly says to leave development mode.

## What this is

Japan, By Days is a static React trip planner for first-time independent travelers from Manila. It generates deterministic Japan itineraries from curated local data and deploys to GitHub Pages.

## Agents / Delegation

When a task explicitly requests a specific agent type (e.g. "reviewer agent"), always dispatch that exact agent type — never substitute a general-purpose agent. Use subagents liberally; one task per subagent to keep main context clean.

**Operating inside a Buzz channel (any provider):** delegation happens at the roster level, not by spawning internal subagents. Each roster identity (Winston, the Elder, the Bowery King, Zero, the Adjudicator, Sofia, Charon, the Operators) is a separate channel member with its own key and model. If a task belongs to another identity's scope, tag that identity in-channel and stop — don't duplicate its work by spinning up an internal subagent to do it yourself. This applies regardless of which provider is running you (Claude or Codex). Outside a Buzz channel (standalone CLI use), internal subagents are fine per the usual delegation rules.

## Workflow Orchestration

- Plan first for any non-trivial task (3+ steps). If something goes sideways, stop and re-plan.
- Checkpoint progress on long multi-phase builds (commit completed phases) so session/rate-limit interruptions don't lose in-flight work.
- Root-cause fixes only — no temporary patches; prefer the simplest solution that solves the problem, touch only what's necessary.
- If a fix feels hacky, implement the proper version. Skip this for simple, obvious fixes.
- Bug report = just fix it, no hand-holding. Point at logs, errors, failing tests, then resolve.
- Explain changes with a brief high-level summary at each step, plus a short review section at the end.

## Testing & Verification

After any code changes, run typecheck, build, and tests before committing. Verify no live functions are flagged as dead code before deleting anything. Never claim something is done without proving it works.

**Ownership inside a Buzz channel:** the agent that wrote the patch runs and reports the existing test suite ("Tests run: N passed") in its own patch summary — don't have a separate identity re-run the same suite as a reflex. A second test pass only happens on explicit escalation (new/uncovered code, changed interface, cross-system behavior) or a scheduled full regression, not on every patch.

## Lessons Log

After any correction from the user, log it to `tasks/lessons.md`. Review that file at the start of each session so the same correction doesn't have to be made twice.

**Inside a Buzz channel:** also post the correction to <b>#lessons-learned</b> (workspace-wide), not just the per-repo file. A correction made in one project should be visible to agents working in another, not siloed to `tasks/lessons.md` in that one repo.

## Version Control / PR Workflow

Before claiming "no pending changes," check `git status` carefully, including gitignored/expanded directories. Always reply to open PR review threads after addressing them.

## Tech stack

- React, TypeScript, and Vite
- Plain CSS and native SVG
- Vitest for planner logic
- GitHub Actions and GitHub Pages

## Architecture

- `src/data.ts` contains curated destinations, route corridors, transport legs, and source metadata.
- `src/planner.ts` exposes the pure `buildItinerary` rules engine.
- `src/App.tsx` is the single-page planner experience.
- No runtime APIs, storage, authentication, analytics, or cookies.

## Commands

- `npm run dev` — local development server
- `npm test` — planner tests
- `npm run typecheck` — TypeScript validation
- `npm run build` — production build
- `npm run preview` — serve the production build
