---
name: roadmap
description: Design or edit a mastery roadmap from the learner's materials (outline mode). Use when the learner is new, has no profile or roadmap, wants to study a new subject, or wants to add, remove, reorder or change modules.
---

# /roadmap — Design the roadmap (outline mode)

This mode has **one product**: a roadmap you both agree on. **No teaching and no quizzing** here.

## 1. Read the state
```bash
node tutor/engine.mjs mode outline
node tutor/engine.mjs status
```
- No `materials/INDEX.md` → run `/ingest` first. The roadmap is built from the learner's materials.
- `status: empty` → write the **first draft** (`build`).
- A roadmap exists and the learner wants a change → change the **smallest piece that is wrong** (`revise <moduleId>`), not a rebuild.
- A new subject → a **new roadmap** with its own id (`calculus`, `spanish-b1`). Use `paths` / `switch` to move between roadmaps.

## 2. Interview (when `intake_needed: true`, or for a new subject)
**Read the materials first** (`materials/INDEX.md`, then the tables of contents), then ask **once**, with the `AskUserQuestion` tool, only what the materials cannot tell you:
- What they can already do in this subject
- What "finished" looks like for them (an exam on a date, a job interview, a project, reading papers in the field)
- How much time they have (per day or week; a deadline if any)
- How they want to be taught: **probe first, then teach the gaps** (`probe_first`) or **teach first, then check** (`teach_first`)

Shape the questions around what the materials turned out to be instead of reciting these four. If they answer two of four, that still counts; **do not press**. Record exactly what they said:
```bash
node tutor/engine.mjs profile - <<'EOF'
{"prior_knowledge":"...", "finish_line":"...", "time_budget":"...", "teaching_strategy":"probe_first", "language":"en"}
EOF
```
`language` is the language they write in (ISO code such as `en`, `vi`, `es`). It localises the engine's question cards. If they decline to answer, say you will start from a reasonable guess and adjust as you go, then do exactly that.

## 3. Draft the roadmap
Rules:
- **Organise around the learner's goal, not a book's table of contents.** Never transcribe one book's chapter order into modules; never write "this chapter" or "the author argues". Several documents get reorganised around the subject, not turned into one module each.
- 3–8 modules, 2–7 objectives (knowledge points) each, prerequisites first.
- Every module has an `objective`: **one sentence saying what the learner can DO** once it clears (an ability, not a topic list).
- Every objective has a `type`:
  - `memory`: facts to recall (definitions, formulas, vocabulary, dates, API names)
  - `procedure`: step-by-step skills (solve this kind of equation, conjugate, write this function, run this analysis)
  - `concept`: ideas to understand (why it works, how parts relate). Cleared by a Feynman explanation
  - `design`: open-ended judgement (choose an approach, structure an essay, design a system). Cleared by a Feynman explanation
- Every objective has `sources`: specific paths (with page or section in the name when helpful) from `materials/INDEX.md`. **Every catalogued material belongs to at least one module**; do not drop one for looking peripheral.
- Short, stable, prefixed ids: `calc-chain-rule`, `es-subjunctive`, `ml-backprop`.
- Cut to `finish_line` and `prior_knowledge`: skip what they already know, stop at what they called finished.

```bash
node tutor/engine.mjs build - <<'EOF'
{"id":"calculus","name":"Calculus for the final exam","goal":"<the learner's goal, verbatim>",
 "modules":[{"id":"calc-m1","name":"Limits","objective":"You can evaluate limits and explain continuity.",
   "materials":["materials/calculus/stewart.pdf"],
   "kps":[{"id":"calc-limit-laws","name":"Limit laws and indeterminate forms","type":"procedure",
           "sources":["materials/calculus/stewart.pdf#p=99-110"]}]}]}
EOF
node tutor/engine.mjs map
```

## 4. Walk through it and revise
Open the dashboard so they can see the whole roadmap (`node ui/server.mjs --ensure --open /`, then share the printed URL), show the map in the chat as well (`map`), explain **what each module is for and why they come in this order**, and ask what they want changed. Change it on the spot:
- Edit one module: `revise <moduleId> -` (the new module JSON). Rewriting an objective **resets its progress**, so say so first. Mastered objectives cannot be rewritten; add a new objective rather than erase earned work.
- Reorder: `order m2,m1,m3` (every module id exactly once).
- A change outside a module's `objective` → say so plainly and offer a redesign (`build --replace`).

When they are happy, say plainly that **the roadmap is settled**. If they want to begin, `mode study` and continue with the `/learn` workflow in the same turn (or another day, whichever they prefer).
