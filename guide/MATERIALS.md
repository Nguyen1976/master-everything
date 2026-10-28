# Materials

Master Everything teaches from **your** sources: the tutor cites the page it teaches from and builds its questions from the same material. Anything Claude Code can read can be studied.

## What can be read

| Format | How |
|---|---|
| Markdown, text, HTML, CSV, JSON, LaTeX, source code | Directly |
| PDF | Directly, by page range. Scanned PDFs are read as images (slower; OCR them if you can) |
| Images (PNG, JPG, diagrams, photos of handwritten notes) | Directly |
| Jupyter notebooks | Directly |
| Word, PowerPoint, Excel, EPUB, Pages, Keynote | **Convert first** (below) |
| Web pages | `/ingest <url>` saves the readable text as Markdown |
| Git repositories | `npm run fetch -- <git-url> --into <name> [--sparse dir1,dir2]` |
| Video and audio | Not directly. Add a transcript or subtitle file instead |

### Converting

Any of these works; use what you already have:

```bash
soffice --headless --convert-to pdf slides.pptx           # LibreOffice
pandoc book.epub -o book.md                                # Pandoc
markitdown report.docx > report.md                         # Microsoft MarkItDown (pip)
```

Or use "Export → PDF" in the original app.

## Organising

- **One folder per collection** (a course, a book series, a subject). The folder name becomes the collection name in the index.
- Keep authoritative sources (official docs, the course textbook, lecture notes) alongside practice material (problem sets, past papers). The tutor uses both: one to teach, the other to test.
- If you include solutions, say so. `/ingest` marks them so the tutor hides them until you have attempted the problems.
- Symlink big libraries instead of copying them: `ln -s ~/Books/physics materials/physics`.

## The index

`/ingest` writes `materials/INDEX.md`: one table per collection listing every file, what it covers, and **where** (page ranges, section names). When teaching an objective, the tutor reads the index, then reads only the relevant pages. Rerun `/ingest` whenever you add files; `npm run scan` shows what is not indexed yet (`+`).

## Presets

A preset is a ready-made bundle of open materials fetched from git:

```bash
npm run fetch -- --list
npm run fetch -- js-node-ts
```

Create your own in `presets/<name>/`:

- `preset.json`: `{"description": "...", "sources": [{"dir": "subject/name", "repo": "https://…git", "sparse": ["docs"], "branch": "main"}]}`
- `INDEX.md` (optional): a pre-written catalogue section, merged into `materials/INDEX.md` on fetch

Only publish presets whose licences allow redistribution of links and local copies, and prefer official sources.

## Copyright

Your materials stay on your machine. `materials/` is git-ignored, so pushing a fork never publishes them.
