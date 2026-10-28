# Materials

Put **your own** learning materials here: one folder per collection (a course, a book, a subject).

```
materials/
  calculus/            lecture-notes.pdf, textbook.pdf, problem-sets/
  system-design/       articles/*.md, slides.pdf
  INDEX.md             written by /ingest — the tutor's catalogue of everything here
```

- Readable directly: Markdown/text, PDF, images, Jupyter notebooks, source code.
- Convert first: Word, PowerPoint, Excel, EPUB → export to PDF or Markdown (see `guide/MATERIALS.md`).
- Big folders elsewhere on disk can be symlinked: `ln -s ~/Books/linear-algebra materials/linear-algebra`.
- Git repositories: `npm run fetch -- <git-url>` · example presets: `npm run fetch -- --list`.

Then run `/ingest` in Claude Code. Everything in this folder except this README is git-ignored.
