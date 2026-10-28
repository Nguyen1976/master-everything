#!/usr/bin/env node
// Check that Master Everything is ready to teach.
//
// Usage: node scripts/doctor.mjs [--json]
// Exit code 0 when every required check passes; optional checks only warn.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
const check = (name, required, fn) => {
  try {
    const detail = fn();
    checks.push({ name, required, ok: true, detail });
  } catch (e) {
    checks.push({ name, required, ok: false, detail: e.message });
  }
};
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

check("node >= 22", true, () => {
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 22) throw new Error(`found ${process.version}; install Node.js 22 LTS or newer`);
  return process.version;
});

check("git available", false, () => execFileSync("git", ["--version"], { encoding: "utf8" }).trim());

check("tutor protocol (CLAUDE.md)", true, () => {
  if (!exists("CLAUDE.md")) throw new Error("CLAUDE.md is missing — the tutor has no instructions");
  return "present";
});

check("skills", true, () => {
  const want = ["roadmap", "learn", "recall", "quiz", "solve", "note", "progress", "ingest"];
  const missing = want.filter((s) => !exists(`.claude/skills/${s}/SKILL.md`));
  if (missing.length) throw new Error(`missing: ${missing.join(", ")}`);
  return want.map((s) => `/${s}`).join(" ");
});

check("engine responds", true, () => {
  const out = JSON.parse(execFileSync("node", [path.join(ROOT, "tutor/engine.mjs"), "status"], { encoding: "utf8" }));
  if (!out.ok) throw new Error(out.error);
  return out.path ? `roadmap "${out.path.name}", mode ${out.mode}` : "no roadmap yet (run /roadmap)";
});

check("learner memory", true, () => {
  const memory = path.join(ROOT, "learning/memory.md");
  if (!fs.existsSync(memory)) {
    fs.copyFileSync(path.join(ROOT, "learning/memory.template.md"), memory);
    return "created learning/memory.md from template";
  }
  return "present";
});

check("materials", true, () => {
  const dir = path.join(ROOT, "materials");
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => !["README.md", "INDEX.md", ".DS_Store", ".gitkeep"].includes(f)) : [];
  if (!entries.length) throw new Error("materials/ is empty — add your own files or run `npm run fetch -- <preset>`");
  return `${entries.length} collection(s): ${entries.slice(0, 6).join(", ")}${entries.length > 6 ? ", …" : ""}`;
});

check("materials index", false, () => {
  if (!exists("materials/INDEX.md")) throw new Error("no materials/INDEX.md yet — run /ingest in Claude Code");
  const scan = JSON.parse(execFileSync("node", [path.join(ROOT, "scripts/scan-materials.mjs"), "--json"], { encoding: "utf8" }));
  const { not_indexed, needs_conversion } = scan.summary;
  if (not_indexed) throw new Error(`${not_indexed} file(s) not in INDEX.md — run /ingest`);
  return needs_conversion.length ? `indexed; ${needs_conversion.length} file(s) need conversion` : "up to date";
});

const failed = checks.filter((c) => c.required && !c.ok);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
} else {
  for (const c of checks) console.log(`${c.ok ? "✔" : c.required ? "✖" : "!"} ${c.name.padEnd(28)} ${c.detail}`);
  console.log(failed.length ? `\n${failed.length} required check(s) failed.` : "\nReady. Open Claude Code in this folder and type /roadmap.");
}
process.exit(failed.length ? 1 : 0);
