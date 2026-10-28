---
name: progress
description: Open the learning dashboard (local web UI) with the roadmap map, the open question, weak spots, quizzes and review schedule, and summarise it. Use when the learner asks "how am I doing", "where am I", "what are my weak spots", "progress", "show me the dashboard".
---

# /progress — Dashboard

1. Open the dashboard:
   ```bash
   node ui/server.mjs --ensure --open /
   ```
   It prints `{"ok": true, "url": "..."}`. Give the learner the **clickable URL**. The page updates live as you teach, so they can keep it open beside the chat.
2. Read the data you will summarise:
   ```bash
   node tutor/engine.mjs status
   node tutor/engine.mjs reviews
   node tutor/engine.mjs bank --wrong --limit 15
   ```
   Also read `learning/memory.md`.
3. In the chat, add what the page cannot (never dump JSON):
   - **Where you are**: the current objective and the next action.
   - **Weak spots**: 2–4 concrete error patterns from wrong answers, grouped by concept rather than listed question by question, each with the material to reread.
   - **Next session** (one line): `/recall` if reviews are due, otherwise `/learn`.

If the server cannot start (`"ok": false`), fall back to `node tutor/engine.mjs map` and show the map in the chat.
