# Web UI

The chat is where the tutor teaches; the browser is where you **see** your progress and **do** practice. Both share the same engine, so anything you answer in the browser counts toward your mastery gates and shows up for the tutor on its next turn.

```bash
npm run ui                                # foreground, prints http://127.0.0.1:4747/
node ui/server.mjs --ensure --open /      # what the tutor runs: start in the background if needed, open a page
```

You rarely start it yourself: the tutor runs it and sends you links. The server listens on `127.0.0.1` only (port 4747, or the next free one; set `ME_PORT` to change it) and has no dependencies.

## Pages

### Dashboard — `/`
- **Progress**: objectives mastered, reviews due, recent accuracy, study streak.
- **Open question**: the question the tutor just asked in the chat. Answer it with a click; multiple-choice, true/false and fill-in answers are graded instantly, written answers go to the tutor.
- **Up next**: the objective the engine has chosen, what kind of step it is (quick check, new lesson, practice, explain), how close you are to its gate (90% for facts and procedures; an explanation for concepts), and its sources.
- **Roadmap**: drawn as a transit line. Each module is a numbered station and each objective a stop; the track you have covered is solid and the rest dashed. The current stop is marked "You are here", mastered stops show a tick, and stops in progress show their score against the gate. The station you are on is open; click any other to expand it. Tabs switch between roadmaps.
- **Reviews**: what is due now and what comes back in the next two weeks.
- **Quizzes**: every practice set with its score and anything awaiting review.
- **Mistakes to revisit**: recent wrong answers with the correct answer and the explanation.

The dashboard updates live (Server-Sent Events) whenever the tutor writes to the engine, so it is meant to stay open beside the chat.

### Quiz — `/quiz/<id>`
Created by `/quiz` (and by `/recall` for review sets). All questions on one page; unsent answers are kept as a draft in your browser. Submit when you like, with some or all questions answered; unanswered ones stay open. Closed questions show right/wrong, the correct answer and the explanation immediately. Written and code answers show "waiting for your tutor" until you tell the tutor you are done; its score and feedback then appear on the page.

## How it fits together

```
browser ──GET /api/snapshot──► server ──► node tutor/engine.mjs snapshot
browser ──POST answer────────► server ──► engine grade --via ui   (closed types)
                                       └► engine answer --via ui  (written answers → tutor)
browser ──POST quiz submit───► server ──► ui/lib/quizzes.mjs ──► engine record -
tutor ───node ui/quiz.mjs new / review ─► ui/lib/quizzes.mjs ──► engine record -
learning/ changes ──fs.watch──► server ──SSE "change"──► browser refetches
```

- Answer keys and explanations never reach the browser before the question is graded.
- Writes require a custom request header and a local origin, so other websites cannot post answers to your server.
- Quiz files live in `learning/quizzes/` (git-ignored) next to the engine state.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{ok, app, root}` |
| GET | `/api/snapshot` | `engine snapshot` plus the quiz list |
| GET | `/api/quiz/<id>` | Quiz with keys hidden until graded |
| POST | `/api/quiz/<id>/submit` | `{answers: {"1": "B", "2": "text"}}` |
| POST | `/api/question/answer` | `{id, answer}` for the open question |
| GET | `/api/events` | Server-Sent Events, `change` on every write |

POST requests need the header `x-master-everything: 1`.

## Design

Flat style with teal primary and orange call-to-action, Lexend headings and Source Sans 3 body text (system fonts when offline), light and dark themes from the OS setting, SVG icons, visible focus rings, 44 px touch targets, and no motion when `prefers-reduced-motion` is set. Results are never conveyed by colour alone: every state also has an icon and a label. Tokens live at the top of `ui/public/styles.css`; learner-facing strings (English and Vietnamese) live in `ui/public/common.js`.
