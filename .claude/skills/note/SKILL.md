---
name: note
description: Save a note to the learner's notebook. Use when the learner says "note this", "save this", "summarise this lesson into my notes".
argument-hint: "[topic or content to note]"
---

# /note — Notebook

1. Identify the topic and, if there is one, the roadmap objective id (`node tutor/engine.mjs map`).
2. Write to `notes/<roadmap>/<topic>.md`. If the file exists, append and never overwrite. Structure:
   ~~~markdown
   ## <Title> · <YYYY-MM-DD> · objective: `<kp-id>`
   **Key idea (in your words):** <prefer the learner's own phrasing, quoted verbatim when available>
   **Example:**
   ```
   ...
   ```
   **Common trap:** ...
   **Source:** `materials/...` (page / section / line)
   ~~~
3. Keep it short; favour a worked example and the trap to avoid. Point to the source instead of copying long passages.
4. Update `notes/README.md` (one index line per note).
5. Tell the learner the file path.
