---
name: ingest
description: Add or refresh the learner's own materials and catalogue them in materials/INDEX.md — a page-anchored catalogue instead of embeddings. Use when the learner adds files, mentions PDFs/notes/slides/repos/links to learn from, or when materials/INDEX.md is missing or stale.
argument-hint: "[path, folder, or git URL to add]"
---

# /ingest — Build the materials catalogue

`materials/INDEX.md` is how you find things later: a catalogue of every collection, what each file covers, and where (page, section, line). There is no vector database — **a good index plus targeted reads is the retrieval system**, so write it carefully.

## 1. Bring the materials in
- Files or folders elsewhere on disk: copy them into `materials/<collection>/`, or symlink large folders (`ln -s <abs-path> materials/<collection>`). Ask before copying anything over 1 GB.
- A git repository: `node scripts/fetch-materials.mjs <git-url> --into <collection> [--sparse dir1,dir2]`.
- A web page: fetch it and save the readable text as Markdown under `materials/<collection>/`, keeping the source URL at the top.
- Example presets (for programming): `node scripts/fetch-materials.mjs --list`.
- Collection names: short, lowercase, by subject (`calculus`, `system-design`, `ielts-writing`).

## 2. Scan
```bash
node scripts/scan-materials.mjs
```
`+` marks files not yet in the index. `needs-conversion` files (docx, pptx, xlsx, epub…) cannot be read directly. Ask the learner to export them to PDF or Markdown, or convert them with a tool already installed (`pandoc`, `soffice --headless --convert-to pdf`, `markitdown`). Never install software without asking.

## 3. Read and catalogue (new files only)
For each new file, read enough to describe it faithfully: the table of contents, headings, the first pages of each chapter. For big PDFs, read in page ranges (`pages: "1-5"`) and look for the outline first. Do not read every page of a 600-page book now; the index needs a map, not a copy.

Append to `materials/INDEX.md`, one section per collection:

```markdown
## <Collection> — <one-line description>
Language: <en/vi/…> · Level: <intro/intermediate/advanced> · Added: <YYYY-MM-DD>

| Id | File | Covers | Where |
|---|---|---|---|
| `calc-stewart` | `materials/calculus/stewart.pdf` | Limits, derivatives, integrals, series | ch2 limits p.77–140 · ch3 derivatives p.141–250 · … |
| `calc-ps3` | `materials/calculus/problem-sets/ps3.pdf` | Chain rule practice + solutions | problems p.1–4, solutions p.5–9 |
```

- `Where` holds page ranges, section names or line anchors, so a later `/learn` can open exactly the right part.
- Note quality signals: official/authoritative, has exercises, has solutions (tell the tutor not to reveal them early), incomplete, outdated.
- When sources disagree, add a `Precedence:` line (official or primary sources first).
- Never paste large passages into the index. It is a map, and the materials stay the source.

## 4. Report and connect
Tell the learner what you catalogued (collections, file counts, anything unreadable). If a roadmap exists and the new material belongs in it, offer to `/roadmap` it in, so each new file is attached to at least one objective's `sources`. If no roadmap exists yet, offer to start `/roadmap`.
