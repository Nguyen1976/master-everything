---
name: quiz
description: Generate a grounded practice set from the learner's materials (explore → plan → generate). Use when the learner asks for "N questions on X", "test me", "mock exam", "practice problems", or a mock interview.
argument-hint: "[topic] [count] [difficulty]"
---

# /quiz — Practice set

Parameters: topic, number of questions (default 5), difficulty (`easy|medium|hard|auto`), question types. If something important is missing, ask **once** with `AskUserQuestion`; otherwise use sensible defaults.

## Phase 1 — Explore (do not write questions yet)
- Read the relevant materials (via `materials/INDEX.md`) and collect concrete passages to ground the questions.
- **Diagnose history**: `node tutor/engine.mjs bank --wrong --limit 30` plus `learning/memory.md`. Find patterns in what goes wrong (which sub-topics, difficulty, question types) and **bias toward those weak spots without repeating old stems**.
- Open with a short paragraph to the learner: what they asked for, which materials the set draws on (cite paths), and, if you diagnosed history, which weak areas this round targets.

## Phase 2 — Plan (silently)
Exactly N templates `{topic, type, difficulty}`. **No two share a topic.** Mix types: choice, tf, fill, short, and code where the subject allows.

## Phase 3 — Write each question
Follow the quality rules in `CLAUDE.md`: distractors are real misconceptions of equal length, no hints, always an explanation. Verify every answer key (run the code, redo the calculation, re-read the passage).

## Present and grade
- Show **the whole set** at once, numbered 1..N; for choice, list options A–D and vary the correct position across questions. **No answers shown.**
- The learner answers, possibly only some questions. Keep the unanswered ones open and never re-ask graded ones.
- Record every answered question in the question bank through the engine: `quiz -` with `"shuffle": false` (the learner already saw the labels), then `grade` immediately.
  - Questions on a roadmap objective use `"kp": "<id>"` and **count toward its mastery gate**.
  - Questions outside the roadmap use `"topic": "<topic>"`: free practice, stored in the bank only.
  - If `/learn` already has a question open, tell the learner and do not overwrite it (unless they ask; then use `--replace`).
- Report: score X/N, each answer right or wrong with its explanation, then **what to restudy**, pointing to specific files and pages.
- Add recurring patterns to **Quiz error patterns** in `learning/memory.md`.
