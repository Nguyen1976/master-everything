# Set Up Master Everything with Your Agent

This guide is for an agent (Claude Code) installing Master Everything for a learner, or fixing an existing installation. For an existing problem, start at [Troubleshooting](#6-troubleshooting) instead of reinstalling. You need terminal and file access. There is no API key, model provider or server to configure: the tutor *is* the Claude Code session the learner already pays for.

## 1. Establish the target

Ask only for what is missing, in one `AskUserQuestion` call, and keep preparing while you wait:

- **Install folder.** Default: `./master-everything` under the current directory. Reuse an existing checkout if there is one.
- **What they want to learn, and from which materials.** Folders or files on disk, git repositories, web pages, or an example preset (`js-node-ts`). Materials are what make this work; without them the tutor can only teach from general knowledge.
- **Language** they want to be taught in (default: the language they are writing in).

Preserve existing learner data. Never delete or overwrite `learning/`, `notes/`, `practice/` or `materials/` in an existing checkout.

## 2. Clone or update

```bash
git clone --depth 1 https://github.com/Nguyen1976/master-everything.git
cd master-everything
```

Existing checkout: `git pull --ff-only`. Learner data is git-ignored, so pulling never touches it.

## 3. Check the runtime

```bash
node --version   # needs v22 or newer
```

If Node.js is missing or older, tell the learner and offer an install route (nodejs.org installer, `brew install node`, `nvm install --lts`, `winget install OpenJS.NodeJS.LTS`). Install only with their consent. Git is needed only for fetching repositories. Nothing else is required: the project has **zero npm dependencies**, so there is no `npm install`.

## 4. Bring in the materials

Pick whatever matches the answer from step 1 (`materials/README.md` has details):

```bash
# Local files: copy, or symlink large folders
cp -R "/path/to/Course Notes" materials/linear-algebra
ln -s "$HOME/Books/statistics" materials/statistics

# A git repository (shallow; --sparse limits it to some folders)
node scripts/fetch-materials.mjs https://github.com/org/repo.git --into my-subject --sparse docs

# An example preset
node scripts/fetch-materials.mjs --list
node scripts/fetch-materials.mjs js-node-ts
```

Then inventory them:

```bash
node scripts/scan-materials.mjs
```

Files marked `needs-conversion` (Word, PowerPoint, Excel, EPUB) cannot be read directly. Use a converter that is already installed (`soffice --headless --convert-to pdf`, `pandoc`, `markitdown`), or ask the learner to export them to PDF. See `guide/MATERIALS.md`.

## 5. Verify and hand off

```bash
npm run doctor
```

Fix every `✖` and rerun. `!` lines are optional; an unindexed `materials/` is expected at this point, because `/ingest` writes the index from inside the tutor session.

Claude Code loads `CLAUDE.md` and the skills in `.claude/skills/` when a session **starts in this folder**. Finish by telling the learner:

1. `cd <install folder> && claude` (or open the folder in the Claude Code desktop/IDE app). Start a fresh session even if this one is already inside the folder.
2. Type `/ingest` to catalogue the materials, then `/roadmap` to get interviewed and receive a roadmap.
3. After that, use `/learn` every session, `/recall` when reviews are due, and `/progress` any time.

Report the install folder, materials added (collections, file counts, anything needing conversion), the doctor result, and any step you could not finish. Do not declare success if `npm run doctor` still fails.

## 6. Troubleshooting

Investigate the symptom; there is no need to run everything.

| Symptom | Check |
|---|---|
| `/roadmap` and other commands don't exist | Session not started in the project folder, or `.claude/skills/*/SKILL.md` missing. `npm run doctor` lists skills. Restart Claude Code in the folder |
| Tutor ignores the protocol or teaches without materials | `CLAUDE.md` missing or the session started elsewhere; `materials/INDEX.md` missing → `/ingest` |
| Engine prints `"ok": false` | Read `error`: it names the fix (open question pending, unknown objective id, review mode on an unmastered objective…). Never hand-edit `learning/state.json` |
| `learning/state.json` corrupted | Restore from a backup if the learner has one. Otherwise move it aside (`mv learning/state.json learning/state.broken.json`): the engine starts fresh, and you can rebuild the roadmap from the old file's `paths` with `build -` |
| Permission prompts on every engine call | `.claude/settings.json` allowlist missing or overridden by a local setting |
| PDF pages unreadable | Scanned images without a text layer: read the pages as images (`pages: "3-5"`), or OCR them if a tool is installed |
| Engine tests | `npm test` runs the engine suite (Node built-in test runner) |

When unresolved, hand over the Node version, the `npm run doctor` output, the failing command, and its exact error.
