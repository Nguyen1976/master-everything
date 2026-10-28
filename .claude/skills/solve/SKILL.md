---
name: solve
description: Work a problem end to end with a plan, verification and a clear explanation (plan → steps → verify → answer). Use when the learner pastes a problem, exercise, code or error and asks "why", "where is the mistake", or "solve this".
argument-hint: "[problem, exercise, or code]"
---

# /solve — Planned problem solving

**The goal is understanding, not just an answer.**

1. **Plan first**: a short analysis plus 2–6 ordered steps (one is fine for a trivial problem). Show the plan to the learner. Do not start solving without one.
2. **Work one step at a time**, each with the right tool:
   - Code: run it in `practice/scratch/` to verify output and errors. **Never guess.**
   - Maths and science: show the working; check results numerically (a quick script is fine) when a slip is possible.
   - Facts and definitions: check them against `materials/` and cite `materials/...` (page, section, line).
   - After each step, say in one sentence what it established.
3. If an approach stalls or turns out wrong, say so and replan (at most once or twice).
4. **Final answer**: state the precise result, then a structured explanation of why, and the underlying principle.
5. **Connect to the roadmap**: if the problem touches an objective (`node tutor/engine.mjs map`), name it and offer a check question (`/learn`). If it exposed a misconception, record it in `learning/memory.md`.

If this is an exercise the learner is **working on themselves** (for example from their materials), first ask whether they want a **hint** or the **full solution**.
