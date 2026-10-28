# Engine reference

`tutor/engine.mjs` is a single-file, dependency-free CLI. Every command prints JSON (or Markdown for `map`, `quiz`, `show`) and exits `0`. Errors print `{"ok": false, "error": "..."}` and exit `2`. Commands that take a body read JSON from stdin when given `-`.

The state file defaults to `learning/state.json`; set `TUTOR_STATE=/path/state.json` to use another (the tests do this).

## Concepts

- **Roadmap** (`path` in the data model): `{id, name, goal, modules[]}`; one per subject. One roadmap is current.
- **Module**: `{id, name, objective, materials[], kps[]}`. `objective` is what the learner can do once the module clears.
- **Objective** (knowledge point, `kp`): `{id, name, type, sources[]}`. `type` is one of `memory | procedure | concept | design`.
- **Mode**: `outline | study | review`.
- **Attempt**: one graded answer, kept in the question bank.

## Commands

| Command | Body / flags | Result |
|---|---|---|
| `status` | | `mode`, `intake_needed`, `profile`, `path`, `pending_question` (with `status` open/answered and `learner_answer`), `ui_activity`, `due_reviews`, `next` (`id`, `type`, `sources`, `action`: `probe\|teach\|practice\|assess`, `stage`, `mastery`, `gate`), `complete`, `summary` |
| `map` | | Markdown progress map of the current roadmap |
| `paths` · `switch <id>` | | List roadmaps · change the current one |
| `mode <outline\|study\|review>` | | |
| `profile -` | `{prior_knowledge, finish_line, time_budget, teaching_strategy: probe_first\|teach_first, language}` (any fields; merged) | |
| `build - [--replace]` | roadmap JSON | Creates the roadmap and makes it current. `--replace` rebuilds it but refuses to drop mastered objectives |
| `revise <moduleId> -` | module JSON | Replaces a module; rewritten objectives lose their evidence; mastered ones must stay identical |
| `order <m1,m2,…>` | | Reorders modules (every id exactly once) |
| `explained <kpId> -` | `{"quote": "..."}` | Records that part of the objective was taught (not mastery) |
| `quiz - [--replace]` | see below | Registers the open question and prints its card |
| `show` | | Re-prints the open card |
| `grade` | `--answer X` (choice/tf/fill) or `--score 0..1`; `--hints`; `--learner "text"`; `--via ui` | Grades the open question: `correct`, `mastery`, `mastered`, `newly_mastered`, `next`, or a `review` schedule for mastered objectives |
| `assess <kpId> pass\|fail [--hints] -` | `{"feedback": "...", "learner_quote": "..."}` | Qualitative gate for concept/design |
| `answer --text ".." [--via ui]` | | Stores the learner's answer to the open question for the tutor to grade (the dashboard uses it for short/code) |
| `ack` | | Marks dashboard results listed in `status.ui_activity` as seen |
| `record -` | normalized question + `learner_answer` and/or `score`, `kp` or `topic`, `via`, `quiz` | Records a graded attempt outside the open-question slot (quiz pages). Closed types are auto-graded |
| `snapshot` | | Everything the dashboard renders: roadmaps with per-objective status/mastery/review, open question (no key), due and upcoming reviews, stats, recent mistakes |
| `skip` | | Drops the open question, no credit |
| `defer <kpId>` · `undefer <kpId>` | | Sets an objective aside without mastering it |
| `repair <attemptId> void\|correct` | | Invalidates a bad attempt or marks it correct, then re-checks the gate |
| `bank [--wrong] [--kp id] [--limit n]` | | Past attempts with question, answer, expected answer and explanation |
| `reviews` | | Due spaced-review items, most overdue first |

### Question body (`quiz -`)

```json
{
  "kp": "objective-id",          // or "topic": "free practice topic" (stored, never gated)
  "type": "choice",              // choice | tf | fill | short | code
  "question": "Stem only — never list the options here",
  "options": ["correct", "misconception 1", "misconception 2", "misconception 3"],
  "answer_index": 0,             // choice only, 0-based, before shuffling
  "expected": "true",            // tf: true|false; fill/short/code: reference answer
  "accept": ["variant"],         // fill: other accepted answers (case-insensitive)
  "explanation": "Why it is right and why the misconceptions are wrong",
  "difficulty": "easy",          // easy | medium | hard
  "shuffle": false               // optional: keep option order (labels already shown)
}
```

## Policy constants

| Constant | Value | Meaning |
|---|---|---|
| `QUANTITATIVE_GATE` | memory 0.9, procedure 0.9 | Mastery threshold per type |
| `RECENCY_WEIGHTS` | 0.5, 0.7, 0.85, 0.95, 1.0 (last 5 attempts) | Newer attempts weigh more |
| `CONFIDENCE_CAP` | 1 attempt → 0.5, 2 → 0.8 | Too few attempts can never pass |
| `INTERVALS` (days) | memory 1,3,7,14,30,60 · concept 3,7,14,30 · procedure 3,7,14 · design 14,28 | Review ladder after mastery |
| Hint penalty | assisted score × 0.5; assisted explanations do not pass | Assisted evidence is weaker than independent recall |
| Review pass mark | score ≥ 0.75 | A review counts as recalled |

To change the pedagogy, edit these constants and update `tutor/test/engine.test.mjs`.

## State file

```jsonc
{
  "version": 1,
  "profile": {},                 // learner profile (merged by `profile`)
  "mode": "study",
  "current_path": "calculus",
  "paths": { "<id>": { "id", "name", "goal", "modules": [...] } },
  "attempts": [ { "id": "a1", "question_id": "q1", "kp", "topic", "type", "question", "options",
                  "expected", "explanation", "learner_answer", "score", "hints", "review", "voided", "at" } ],
  "qualitative": { "<kpId>": { "passed", "hints", "feedback", "at" } },
  "mastered": { "<kpId>": { "at", "source": "system" } },
  "deferred": ["<kpId>"],
  "explained": { "<kpId>": { "quote", "at", "coverage": "partial" } },
  "reviews": { "<kpId>": { "step", "due_at", "last" } },
  "pending": { /* the open question, including its hidden expected answer */ },
  "counters": { "attempt": 0, "question": 0 }
}
```

## Localisation

Question cards and maps are shown to the learner verbatim, so their labels follow `profile.language`. English and Vietnamese ship in the `STRINGS` table at the top of the engine; add a language by adding one entry there. Everything else the learner reads is written by the tutor in their language.
