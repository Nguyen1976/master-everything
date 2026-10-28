---
name: progress
description: Show the learning dashboard — roadmap map, weak spots and review schedule. Use when the learner asks "how am I doing", "where am I", "what are my weak spots", "progress".
---

# /progress — Dashboard

```bash
node tutor/engine.mjs paths
node tutor/engine.mjs map
node tutor/engine.mjs reviews
node tutor/engine.mjs bank --wrong --limit 15
```
Also read `learning/memory.md`. Present it (never dump JSON):
1. **Map** of the current roadmap (the `map` output verbatim). With several roadmaps, one summary line for each.
2. **Where you are**: the current objective and the next action.
3. **Reviews**: how many are due, and the next review date.
4. **Weak spots**: 2–4 concrete error patterns from wrong answers, grouped by concept rather than listed question by question, each with the material to reread.
5. **Next session** (one line): `/recall` if reviews are due, otherwise `/learn`.
