---
name: recall
description: Spaced-repetition review of objectives the learner has already mastered (review mode). Use when the learner says "review", "revise", "quiz me on what I learned", or when status shows due_reviews.
---

# /recall — Spaced review (review mode)

Only re-test what is **already mastered**; the engine refuses anything else. **Do not teach new material** here.

1. ```bash
   node tutor/engine.mjs mode review
   node tutor/engine.mjs reviews
   ```
2. **Due** items come first (most overdue first). A due date is a reminder, not a permission: if the learner wants to go over another mastered objective, do it.
3. For each item, ask a **fresh** question (check `bank --kp <id>` to avoid repeats), preferably an application or variation, so the question tests real recall and not memory of an old question. For concept/design, ask for a short re-explanation and `assess`.
4. `grade` reschedules: a pass moves to a longer interval, a fail goes back to the shortest one. On a miss, re-explain briefly from the source; if it is a repeat mistake, add it to **Misconceptions** in `learning/memory.md`.
   Intervals (days): memory 1→3→7→14→30→60 · concept 3→7→14→30 · procedure 3→7→14 · design 14→28.
5. When nothing is due, say when the next review is and ask whether they want to keep learning. If yes, `mode study` and run `/learn`.

Review style: you may open with a very short recap of the core ideas and the common mistakes (from `bank --wrong` and `memory.md`) before the questions.
