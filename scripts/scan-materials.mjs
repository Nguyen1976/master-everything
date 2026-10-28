#!/usr/bin/env node
// Inventory the learner's materials/ folder for the /ingest skill.
//
// Lists every file grouped by collection (top-level folder), with size and a
// rough length (lines for text, pages for PDF), flags formats Claude Code
// cannot read directly, and reports which files materials/INDEX.md does not
// mention yet — so ingestion can be incremental.
//
// Usage: node scripts/scan-materials.mjs [--json]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATERIALS = path.join(ROOT, "materials");
const INDEX = path.join(MATERIALS, "INDEX.md");

const SKIP_DIRS = new Set([".git", "node_modules", ".venv", "__pycache__"]);
const SKIP_FILES = new Set(["INDEX.md", "README.md", ".DS_Store"]);
const TEXT = new Set([".md", ".mdx", ".txt", ".rst", ".adoc", ".html", ".htm", ".csv", ".json", ".yaml", ".yml", ".tex"]);
const CODE = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".java", ".go", ".rs", ".c", ".cpp", ".h", ".cs", ".rb", ".php", ".swift", ".kt", ".sql", ".sh"]);
const NATIVE = new Set([".pdf", ".ipynb", ".png", ".jpg", ".jpeg", ".gif", ".webp"]);
// Readable only after conversion (see guide/MATERIALS.md).
const CONVERT = new Set([".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".epub", ".odt", ".rtf", ".key", ".pages"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    let stat;
    try {
      stat = fs.statSync(full); // follows symlinks, so linked folders count
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, files);
    } else if (!(dir === MATERIALS && SKIP_FILES.has(entry.name)) && entry.name !== ".DS_Store") {
      files.push({ full, size: stat.size });
    }
  }
  return files;
}

function describe({ full, size }) {
  const rel = path.relative(ROOT, full);
  const ext = path.extname(full).toLowerCase();
  const item = { path: rel, ext, kb: Math.round(size / 1024) };
  if (TEXT.has(ext) || CODE.has(ext)) {
    item.kind = TEXT.has(ext) ? "text" : "code";
    if (size < 5_000_000) item.lines = fs.readFileSync(full, "utf8").split("\n").length;
  } else if (NATIVE.has(ext)) {
    item.kind = ext === ".pdf" ? "pdf" : ext === ".ipynb" ? "notebook" : "image";
    if (ext === ".pdf" && size < 200_000_000) {
      // Rough page count without a PDF library; good enough for planning reads.
      const raw = fs.readFileSync(full, "latin1");
      item.pages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length || undefined;
    }
  } else if (CONVERT.has(ext)) {
    item.kind = "needs-conversion";
  } else {
    item.kind = "other";
  }
  return item;
}

if (!fs.existsSync(MATERIALS)) {
  console.error("materials/ does not exist — create it and add your files.");
  process.exit(1);
}

const items = walk(MATERIALS).map(describe);
const indexText = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, "utf8") : "";
// A file counts as indexed when its own path appears in INDEX.md, or a folder
// above it is listed as a folder entry ("materials/x/" followed by a delimiter),
// so mentioning one file never marks its siblings as indexed.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const indexed = (p) => {
  const parts = p.split(path.sep);
  if (indexText.includes(parts.join("/"))) return true;
  for (let i = parts.length - 1; i > 1; i--) {
    const folder = parts.slice(0, i).join("/");
    if (new RegExp(`${escape(folder)}/(?=[\`\\s|)]|$)`, "m").test(indexText)) return true;
  }
  return false;
};
for (const it of items) it.indexed = indexed(it.path);

const collections = {};
for (const it of items) {
  const name = it.path.split(path.sep)[1] || "(root)";
  (collections[name] ||= []).push(it);
}

const summary = {
  index_exists: Boolean(indexText),
  total_files: items.length,
  not_indexed: items.filter((i) => !i.indexed && i.kind !== "other").length,
  needs_conversion: items.filter((i) => i.kind === "needs-conversion").map((i) => i.path),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ summary, collections }, null, 2));
} else {
  for (const [name, list] of Object.entries(collections)) {
    const fresh = list.filter((i) => !i.indexed).length;
    console.log(`\n## ${name}  (${list.length} files${fresh ? `, ${fresh} not in INDEX.md` : ""})`);
    for (const it of list.slice(0, 60)) {
      const len = it.pages ? `${it.pages} pages` : it.lines ? `${it.lines} lines` : `${it.kb} KB`;
      console.log(`- ${it.indexed ? " " : "+"} ${it.path}  [${it.kind}, ${len}]`);
    }
    if (list.length > 60) console.log(`  … ${list.length - 60} more (use --json for all)`);
  }
  console.log(`\n${JSON.stringify(summary)}`);
}
