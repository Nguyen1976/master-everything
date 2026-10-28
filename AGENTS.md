# Master Everything — guide for agents and contributors

This file is for **developing** Master Everything. When a session in this folder is *studying*, `CLAUDE.md` (the tutor protocol) governs instead. Claude Code loads `CLAUDE.md` automatically, so when you work on the project itself, tell the agent you are developing rather than learning.

## Map

| Path | What lives there | Change it when |
|---|---|---|
| `CLAUDE.md` | Tutor protocol, always loaded | Turn semantics, teaching playbook, question-quality or memory rules change |
| `.claude/skills/<name>/SKILL.md` | One workflow per learner command | A command's workflow changes, or you add a command |
| `tutor/engine.mjs` | Policy engine CLI (no dependencies) | Gate, scoring, scheduling, state shape, card rendering |
| `tutor/test/*.test.mjs` | Engine and UI server tests (`npm test`) | Every engine or UI change |
| `ui/` | Local web UI: `server.mjs` (node:http, SSE), `quiz.mjs` (CLI), `lib/quizzes.mjs`, `public/` (HTML/CSS/JS, no build) | Dashboard or quiz behaviour, design tokens (`public/styles.css`), UI strings (`public/common.js`) |
| `scripts/` | `doctor`, `scan-materials`, `fetch-materials` | Setup, inventory or fetching behaviour |
| `presets/<name>/` | `preset.json` + optional `INDEX.md` | Adding or updating material bundles |
| `guide/` | User and agent documentation | Behaviour visible to users changes |
| `learning/memory.template.md` | Seed for `learning/memory.md` | Memory sections change (keep in sync with `CLAUDE.md`) |

## Invariants

1. **The engine owns mastery.** Skills and `CLAUDE.md` must never instruct the tutor to mark something mastered by any path other than `grade` / `assess` clearing the gate.
2. **Easy to install.** Prefer Node built-ins (Node ≥ 22). Add a dependency when it clearly helps learners, and keep setup to a few commands.
3. **Learner data is never committed.** `learning/state.json`, `learning/memory.md`, `notes/*`, `practice/*` and `materials/*` stay git-ignored.
4. **English in the repository.** Code, comments, prompts and docs are written in English. Learner-facing strings in the engine live in the `STRINGS` table and are localised by `profile.language`.
5. **Subject-agnostic core.** Programming-specific advice appears only as conditional guidance ("when the subject is code…") or inside presets.
6. **Command names must not clash** with Claude Code built-ins (for example, use `/recall` rather than `/review`).

## Workflow

```bash
npm test          # engine suite
npm run doctor    # readiness checks
```

- Changing a policy constant: update `guide/ENGINE.md` (constants table), `guide/ARCHITECTURE.md` and README "How it works" if user-visible, then the tests.
- Adding a command: create `.claude/skills/<name>/SKILL.md` (frontmatter `name`, `description`, optional `argument-hint`), list it in `CLAUDE.md`, the README command table and the `doctor` skill list.
- Adding a language: add an entry to `STRINGS` in `tutor/engine.mjs` and in `ui/public/common.js`, and extend the localisation test.
- UI rules: the browser never decides grades or mastery (it calls the engine), answer keys never reach it before grading, writes require the `x-master-everything` header, and every state is shown with an icon and a label, not colour alone.
- Keep prompts imperative and specific; when a rule is adapted from third-party work, record it in `THIRD_PARTY_NOTICES.md`.
