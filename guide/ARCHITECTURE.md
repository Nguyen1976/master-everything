# Architecture

Master Everything adds almost no infrastructure of its own on top of Claude Code. **Claude Code is the agent loop and the conversation**, a **small local web server** gives the learner a live dashboard and quiz pages, the **filesystem is the knowledge base**, and a **single-file, dependency-free engine** keeps the one thing an LLM should not be trusted with: deciding when something has been learned.

```
   Learner ⇄ Claude Code session            Learner ⇄ Browser (dashboard, quizzes)
                 │                                                │
   ┌─────────────┼────────────────────┐               ui/server.mjs (127.0.0.1)
   │             │                    │                           │
 CLAUDE.md   .claude/skills/*   Read / Bash tools                 │
 (protocol)  (workflows)              │                           │
   └──────┬──────┘                    ▼                           │
          │                    materials/ + INDEX.md              │
          ▼                    (the learner's sources)            │
   tutor/engine.mjs  ◄────────────────────────────────────────────┘
   (deterministic policy: gate, scoring, reviews, question bank)
          │
          ▼
   learning/state.json · quizzes/ · memory.md · notes/ · practice/
```

## Layers

| Layer | File(s) | Responsibility |
|---|---|---|
| **Protocol** | `CLAUDE.md` | Who the tutor is and how a turn runs: one objective per turn, at most one question, and the question last. Teaching playbook, question-quality rules, memory rules. Always loaded |
| **Workflows** | `.claude/skills/<name>/SKILL.md` | One skill per learner command, loaded on demand when the learner types `/<name>` or the intent matches |
| **Policy engine** | `tutor/engine.mjs` | Gate thresholds, mastery scoring, spaced-review scheduling, question cards, question bank. Pure Node, no dependencies, JSON in and JSON out |
| **Knowledge** | `materials/`, `materials/INDEX.md` | The learner's files plus a catalogue with page/section anchors. Retrieval means reading the index, then reading the right pages |
| **Memory** | `learning/memory.md` | Durable, evidence-backed observations about the learner, curated by the tutor |
| **Learner artefacts** | `notes/`, `practice/` | Notebook and scratch work |
| **Web UI** | `ui/server.mjs`, `ui/quiz.mjs`, `ui/lib/quizzes.mjs`, `ui/public/*` | Dashboard and quiz pages on 127.0.0.1. Reads `engine snapshot`, forwards answers to `engine grade/answer/record`, pushes live updates. See `guide/UI.md` |
| **Ops** | `scripts/doctor.mjs`, `scan-materials.mjs`, `fetch-materials.mjs` | Readiness checks, material inventory, repository and preset fetching |

## The learning loop

```
/ingest ─► /roadmap ─────────► /learn ───────────────────────► /recall
catalogue  outline mode:        study mode, per objective:      review mode:
materials  interview → profile  probe or teach → quiz/assess    due items first,
           → modules and        → grade → engine checks gate    pass → longer interval,
             objectives           → next objective              fail → shortest interval
```

| Command | Mode | Engine calls |
|---|---|---|
| `/ingest` | — | none (writes `materials/INDEX.md`) |
| `/roadmap` | `outline` | `profile`, `build`, `revise`, `order`, `map` |
| `/learn` | `study` | `status`, `explained`, `quiz`, `grade`, `assess`, `skip`, `defer`, `repair` |
| `/recall` | `review` | `reviews`, `bank`, `quiz`, `grade`, `assess` |
| `/quiz` | any | `bank --wrong`; `ui/quiz.mjs new / results / review` (which call `record`) |
| `/solve` | any | `map` (to link the problem to an objective) |
| `/note`, `/progress` | any | `map`, `paths`, `reviews`, `bank`; `ui/server.mjs --ensure --open /` |

Answers given in the browser reach the tutor through `status`: `ui_activity` (graded closed answers, cleared with `ack`) and `pending_question.status: "answered"` (written answers to grade).

## Why an engine at all?

The central rule is that **the gate is decided by the engine, not by the tutor's impression**. An LLM grading its own teaching drifts toward leniency: "great, you've got it!" after one lucky answer. The engine makes that impossible:

- **Memory / procedure** objectives need recency-weighted accuracy ≥ 0.9 over the last 5 attempts (weights 0.5, 0.7, 0.85, 0.95, 1.0). One or two attempts are capped at 0.5 and 0.8, so they can never pass.
- **Concept / design** objectives pass only through a recorded Feynman explanation (`assess`).
- Hint-assisted evidence counts for half; hint-assisted explanations do not pass.
- Mastery is sticky and starts a review ladder: memory 1→3→7→14→30→60 days, concept 3→7→14→30, procedure 3→7→14, design 14→28. A failed review drops back to the shortest interval.
- Only one question can be open. Review mode refuses unmastered objectives. Rewriting an objective resets its evidence, and mastered objectives cannot be rewritten.

The engine also shuffles multiple-choice options, so position carries no signal, and stores every attempt with its explanation, which makes the question bank useful for review.

## State

`learning/state.json` (git-ignored) holds the profile, the roadmaps (`paths`), attempts, qualitative passes, mastery stamps, deferrals, explanation records, the review schedule, the open question, and id counters. `guide/ENGINE.md` documents every field and command. All writes are atomic (write to a temp file, then rename).

## Trade-offs

- **Retrieval without embeddings.** It works well for structured materials (books, course notes, docs) when `INDEX.md` has good anchors, and less well for thousands of unstructured snippets. Keep collections curated.
- **Context, not infrastructure, is the limit.** Read page ranges and sections, never whole books.
- **One learner per folder.** For several learners, clone once per learner.
