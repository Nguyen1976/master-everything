---
name: quiz
description: Generate a grounded practice set from the learner's materials (explore → plan → generate) and hand it over as a quiz page in the local web UI. Use when the learner asks for "N questions on X", "test me", "mock exam", "practice problems", a mock interview, or says they finished a quiz.
argument-hint: "[topic] [count] [difficulty]"
---

# /quiz — Practice set

Parameters: topic, number of questions (default 5), difficulty (`easy|medium|hard|auto`), question types. If something important is missing, ask **once** with `AskUserQuestion`; otherwise use sensible defaults.

## Phase 1 — Explore (do not write questions yet)
- Read the relevant materials (via `materials/INDEX.md`) and collect concrete passages to ground the questions.
- **Diagnose history**: `node tutor/engine.mjs bank --wrong --limit 30` plus `learning/memory.md`. Find patterns in what goes wrong (which sub-topics, difficulty, question types) and **bias toward those weak spots without repeating old stems**.

## Phase 2 — Plan (silently)
Exactly N templates `{topic, type, difficulty}`. **No two share a topic.** Mix types: choice, tf, fill, short, and code where the subject allows.

## Phase 3 — Write each question
Follow the quality rules in `CLAUDE.md`: distractors are real misconceptions of equal length, no hints, always an explanation. Verify every answer key (run the code, redo the calculation, re-read the passage). Questions on a roadmap objective use `"kp": "<id>"` and **count toward its mastery gate**; questions outside the roadmap use `"topic": "<topic>"` (free practice, stored in the question bank only). Question text supports Markdown: fenced code blocks, `inline code`, **bold**, lists.

## Phase 4 — Publish the quiz page
```bash
node ui/quiz.mjs new - --open <<'EOF'
{"title": "<short title>", "intro": "<one or two sentences: what it covers, which materials, which weak spots it targets>",
 "questions": [
  {"kp": "calc-chain-rule", "type": "choice", "difficulty": "medium", "question": "...", "options": ["...", "...", "...", "..."], "answer_index": 0, "explanation": "..."},
  {"kp": "calc-limits", "type": "fill", "question": "... ____ ...", "expected": "...", "accept": ["..."], "explanation": "..."},
  {"topic": "proofs", "type": "short", "question": "...", "expected": "<reference answer>", "explanation": "..."}
 ]}
EOF
```
This starts the local UI if needed, opens the page in the browser, and prints `url`. Options are shuffled once and saved, so write `answer_index` against the order you give. Reply to the learner with a short intro (what the set covers, materials cited, weak spots targeted) and the **clickable URL**, and tell them to come back here when they are done. Do not paste the questions into the chat.

If `url` is null (the server could not start), fall back to presenting the set in the chat, numbered 1..N, and record each answer with `node tutor/engine.mjs record -` afterwards.

## Phase 5 — When the learner says they finished
```bash
node ui/quiz.mjs list --pending        # quizzes with written answers waiting for you
node ui/quiz.mjs results <id>          # every answer with its key, explanation and status
```
- Choice, true/false and fill-in answers were already graded in the browser and recorded through the engine.
- For each `awaiting_review` answer (short/code), judge it against the reference: run the code, check each step. Then record your verdict. The learner sees the score and your feedback on the page instantly:
  ```bash
  node ui/quiz.mjs review <id> <n> <score 0..1> --feedback "<one or two sentences, in the learner's language>"
  ```
- Then report in the chat: the score, the 1–3 most instructive mistakes (the misconception behind each, with a pointer to the exact file and page to restudy), and whether any objective cleared its gate (`node tutor/engine.mjs status`).
- Add recurring patterns to **Quiz error patterns** in `learning/memory.md`.
