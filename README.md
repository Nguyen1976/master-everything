<div align="center">

# Master Everything

**Mastery-based tutoring for any subject, from your own materials — inside Claude Code.**
A live dashboard and quiz pages on your machine. No API key. No vector database. One prompt to set up.

[Get started](#-get-started) · [How it works](#-how-it-works) · [Dashboard & quizzes](#%EF%B8%8F-dashboard--quizzes) · [Commands](#-commands) · [Architecture](guide/ARCHITECTURE.md) · [Agent setup](guide/AGENT_SETUP.md)

![license](https://img.shields.io/badge/license-Apache--2.0-blue) ![node](https://img.shields.io/badge/node-%E2%89%A522-339933) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen) ![runs in](https://img.shields.io/badge/runs%20in-Claude%20Code-d97757)

</div>

---

## ✨ Why

Learning sticks when someone teaches from your actual course, checks that you can really do it, and brings it back before you forget. Master Everything turns your Claude Code session into that tutor:

- **It learns from your materials**: textbooks, lecture notes, papers, docs, past exams. It cites the page it teaches from.
- **It interviews you first**, then designs a roadmap around your goal, level and time.
- **It does not let you move on until you have mastered each objective**, and an engine with hard thresholds decides that, not the model's mood.
- **It brings things back** on a spaced-repetition schedule and keeps a question bank of every mistake, with explanations.
- **It remembers you**: your misconceptions, error patterns, and the explanations that worked.

All of it runs in the Claude Code chat you already have, with a local web UI beside it:

| | |
|---|---|
| Interface | Your Claude Code chat to learn, plus a local dashboard and quiz pages in your browser |
| Model | Your existing Claude Code plan (Pro works). No API key |
| Knowledge base | Your own files plus a page-anchored index. No vector database |
| Install | `git clone` + Node.js ≥ 22. Zero dependencies, nothing to host |
| Subjects | Anything your materials cover: programming, maths, languages, medicine, law, exam prep… |

## 🚀 Get Started

### Let your agent set it up (recommended)

Open Claude Code in the folder where you want it and paste:

```text
Set up Master Everything for me from https://github.com/Nguyen1976/master-everything.
Clone it (or reuse my existing checkout), then read CLAUDE.md and guide/AGENT_SETUP.md
and follow that guide: check Node.js, ask me what I want to learn and where my
materials are, bring them into materials/, run the doctor, and tell me how to start
my first lesson. Preserve any existing learning data.
```

Your agent clones the repo, brings in your PDFs, notes or repositories, verifies everything with `npm run doctor`, and tells you what to do next.

### Or do it yourself

```bash
git clone --depth 1 https://github.com/Nguyen1976/master-everything.git
cd master-everything
cp -R ~/path/to/your/course materials/my-course     # or: npm run fetch -- --list
npm run doctor
claude                                              # start Claude Code here
```

Then type **`/ingest`** (catalogue your materials) and **`/roadmap`** (get interviewed and receive a plan).

> **Requirements:** [Claude Code](https://docs.claude.com/en/docs/claude-code) on any plan, Node.js 22 or newer, and git (only for fetching repositories). Works in the terminal, desktop app and IDE extensions.

## 🧭 How it works

```
 /ingest ──► /roadmap ──► /learn ⇄ quiz / grade ──► mastered ──► /recall (1, 3, 7, 14… days)
   │            │            │                         ▲
 index your   interview    teach from your       the engine decides,
 materials    + design     sources, one          not the tutor's mood
              modules      objective at a time
```

1. **Your materials are the curriculum.** Drop PDFs, lecture notes, slides (exported to PDF), Markdown, code repositories or saved web pages into `materials/`. `/ingest` writes a catalogue with page and section anchors, so the tutor opens exactly the right pages instead of answering from memory.
2. **An interview, then a roadmap.** The tutor asks what you already know, what "done" means (an exam, an interview, a project), how much time you have, and whether you want to be **tested first** or **taught first**. It then designs modules around *your goal*, not a book's table of contents.
3. **A hard mastery gate.** Facts and procedures need **≥ 90% recency-weighted accuracy**, and one or two lucky answers can never pass. Concepts and design judgement pass only when you **explain them in your own words** (the Feynman technique). Answers that needed hints count for half.
4. **Questions that discriminate.** Each wrong option encodes a real misconception, options are shuffled, and every question carries an explanation that goes into your question bank.
5. **Spaced review.** Mastered objectives come back on a schedule (memory: 1 → 3 → 7 → 14 → 30 → 60 days); a miss resets the ladder.
6. **It remembers you.** `learning/memory.md` keeps evidence-backed notes on your misconceptions, error patterns and the explanations that worked for you.

## 🖥️ Dashboard & quizzes

The tutor talks in the chat and sends you links for everything that is better seen or clicked:

- **Dashboard** (`/progress`, or after any roadmap change): mastered objectives, reviews due, accuracy and streak; the question the tutor just asked, answerable with a click; what's next and how close you are to its gate; the full roadmap with a mastery bar per objective; upcoming reviews; quizzes; and recent mistakes with explanations. It updates live while you study.
- **Quiz pages** (`/quiz`): the whole set on one page. Choice, true/false and fill-in answers are graded on submit, with the correct answer and explanation; written and code answers go to your tutor, whose score and feedback then appear on the page.

![Dashboard](guide/images/dashboard.png)

<details>
<summary><b>Quiz page</b></summary>

![Quiz page](guide/images/quiz.png)

</details>

Everything runs on `127.0.0.1` with no dependencies, and every answer goes through the same engine as the chat. See **[guide/UI.md](guide/UI.md)**.

## ⌨️ Commands

| Command | What it does |
|---|---|
| `/ingest [path\|url]` | Add materials and update the catalogue `materials/INDEX.md` |
| `/roadmap` | Interview, design or edit a roadmap; add a roadmap for another subject |
| `/learn` | Continue: teach → check → grade until the gate clears |
| `/recall` | Spaced review of what you have mastered |
| `/quiz [topic] [n] [difficulty]` | A practice set grounded in your materials, aimed at your weak spots, as a quiz page |
| `/solve [problem]` | Planned, verified, step-by-step solution |
| `/note [topic]` | Save a note to `notes/` |
| `/progress` | Open the dashboard and summarise weak spots and the review schedule |

You can also just talk: *"explain that differently"*, *"that answer key is wrong"*, *"skip this question"*, *"park this topic"*, *"let's review"*.

## 📚 Materials

Anything Claude Code can read works: Markdown, text, PDF, images, notebooks and code. Word, PowerPoint and EPUB files must be exported first. See **[guide/MATERIALS.md](guide/MATERIALS.md)**. Everything in `materials/` stays on your machine and is git-ignored.

Want a head start? Presets fetch curated open materials:

```bash
npm run fetch -- --list
npm run fetch -- js-node-ts      # YDKJS Yet, javascript.info, MDN, Node.js docs, TS Handbook, Type Challenges…
```

Adding a preset takes two files ([how](guide/MATERIALS.md#presets)), and contributions are welcome.

## 🏗️ Architecture

```
CLAUDE.md                  tutor protocol: turn rules, teaching playbook, question quality, memory rules
.claude/skills/<cmd>/      one workflow per command (ingest, roadmap, learn, recall, quiz, solve, note, progress)
tutor/engine.mjs           deterministic policy: mastery gate, scoring, spaced review, question bank
ui/                        local web UI: dashboard + quiz pages (node:http, no dependencies)
materials/  + INDEX.md     your sources and their page-anchored catalogue
learning/                  state.json (engine data) · memory.md (what the tutor knows about you)
notes/ · practice/         your notebook and scratch work
scripts/                   doctor · scan-materials · fetch-materials
guide/                     AGENT_SETUP · ARCHITECTURE · ENGINE · MATERIALS · UI
presets/                   optional material bundles
```

Claude Code is the agent loop; the browser shows progress and hosts practice. The engine holds the one decision an LLM should not make on its own: **whether you have learned it**. See **[guide/ARCHITECTURE.md](guide/ARCHITECTURE.md)** for the design, and **[guide/ENGINE.md](guide/ENGINE.md)** for the engine CLI and data model.

<details>
<summary><b>Engine at a glance</b></summary>

```bash
node tutor/engine.mjs status      # what to work on next, open question, due reviews
node tutor/engine.mjs map         # progress map
node tutor/engine.mjs bank --wrong
npm test                          # engine test suite (node:test)
```

</details>

<details>
<summary><b>Privacy & data</b></summary>

All learning data (`learning/state.json`, `learning/quizzes/`, `learning/memory.md`, `notes/`, `practice/`, `materials/`) lives in your folder and is git-ignored. What leaves your machine is only what any Claude Code session sends: the conversation and the files the tutor reads to teach you.

</details>

<details>
<summary><b>Limitations</b></summary>

- No embeddings: retrieval relies on a good `INDEX.md`. Curated collections work best.
- Long sources are read in parts, so very large libraries take longer to ingest.
- One learner per folder (clone again for another learner).
- Mathematical notation is plain text and Unicode, because terminals don't render LaTeX.

</details>

## 🤝 Contributing

Issues and pull requests are welcome: presets, translations of the engine's card strings, better skills, and engine tests. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).

## 📄 License

[Apache-2.0](LICENSE) · third-party notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Master Everything is an independent project, not affiliated with Anthropic.
