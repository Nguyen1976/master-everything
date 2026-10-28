---
name: learn
description: Continue studying the current roadmap (study mode) — teach and check one objective at a time through its mastery gate. Use when the learner says "let's study", "keep going", "teach me", or is answering an open question.
---

# /learn — Study the roadmap (study mode)

## Every turn
1. `node tutor/engine.mjs status`. If `mode` is not `study`, run `mode study`. With no roadmap or profile, run `/roadmap` first.
2. At the start of a session, read `learning/memory.md` (old misconceptions, teaching that worked) and open the `sources` of `next`, only the relevant pages or sections.
3. Work on **exactly one objective**: `next`. The `next.action` table is in `CLAUDE.md`.
4. End the turn either with an answer only, or with **one** question as the last action (`quiz -`, then show the card). The same question also appears on the dashboard (`node ui/server.mjs --ensure` prints its URL), where the learner can answer it with a click. Mention the link the first time in a session.

## Answers given in the dashboard
`status` tells you what the learner did in the browser since your last turn:
- `ui_activity` lists questions they answered **and the engine already graded** (choice/tf/fill). Respond to each one as if they had answered in the chat (praise or correct, explain from the source), then run `node tutor/engine.mjs ack`.
- `pending_question.status: "answered"` means they wrote a short/code answer there (`learner_answer`). Grade it now with `grade --score <0..1>`, exactly as below.

## When the message answers the open question
- `grade --answer "<answer>"` for choice/tf/fill. For short/code, judge it against the reference (run code or redo the working if needed), then `grade --score <0..1> --learner "<quote>"`.
- Feedback: when right, praise **specifically** what they did right. When wrong, explain why **from the source**, name the misconception, and give a different example. **Do not immediately repeat the same question.**
- Read the engine's `mastered` / `mastery`:
  - Not yet → the next question on the same objective from a different angle (rising difficulty, different form: predict, spot the error, apply to a new case).
  - `newly_mastered: true` → congratulate briefly, name the next objective (`next`), then teach or probe it.
- Concept/design: the learner explains in their own words. Judge it Feynman-style (is it simple? anything important missing? any misunderstanding?):
  ```bash
  node tutor/engine.mjs assess calc-chain-rule-why pass - <<'EOF'
  {"feedback":"Explained the chain rule as composing rates of change, with a correct example","learner_quote":"<verbatim>"}
  EOF
  ```
  `pass` only when the explanation **truly** shows understanding. Add `--hints` if they needed prompting.

## Practice
For `procedure` objectives, set a small exercise in `practice/<roadmap>/`: a problem to work, code to write, a paragraph to draft. Check it (run code, verify each step) and grade with `--score`. Exercises in the materials make good sources. When the materials include solutions, **do not show them first**.

## End of session
When the learner stops, sum up what they learned in 2–3 lines, update `learning/memory.md` following the rules in `CLAUDE.md`, and mention `/recall` if reviews are due.

## Exceptions
- An objective is too easy, too hard or wrong for them → `mode outline`, `revise` that one module, `mode study` again. Say each time you switch.
- They want to review → switch to `/recall`; do not quietly review in study mode.
- They want to revisit a finished lesson → work inside that module and record outcomes through the gate as usual, then offer to return to `next`. Never invent an objective the roadmap does not contain.
