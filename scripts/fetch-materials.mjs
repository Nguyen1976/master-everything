#!/usr/bin/env node
// Download learning materials from git repositories into materials/.
//
//   node scripts/fetch-materials.mjs --list                 list presets
//   node scripts/fetch-materials.mjs <preset>               fetch every source of a preset
//   node scripts/fetch-materials.mjs <git-url> [--into <dir>] [--sparse a,b]
//
// Clones are shallow, and .git is removed afterwards to save disk space
// (pass --keep-git to keep it). Existing folders are left untouched unless
// --force is given. A preset's INDEX.md is merged into materials/INDEX.md.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MATERIALS = path.join(ROOT, "materials");
const PRESETS = path.join(ROOT, "presets");

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const target = args.find((a, i) => !a.startsWith("--") && !["--into", "--sparse"].includes(args[i - 1]));

function git(argv, cwd) {
  execFileSync("git", argv, { cwd, stdio: ["ignore", "ignore", "inherit"] });
}

function clone({ repo, dir, sparse, branch }) {
  const dest = path.join(MATERIALS, dir);
  if (fs.existsSync(dest)) {
    if (!flag("force")) return console.log(`= ${dir} (already present)`);
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const argv = ["clone", "--depth", "1", "--quiet"];
  if (branch) argv.push("--branch", branch);
  if (sparse?.length) argv.push("--filter=blob:none", "--sparse");
  git([...argv, repo, dest]);
  if (sparse?.length) git(["sparse-checkout", "set", ...sparse], dest);
  if (!flag("keep-git")) fs.rmSync(path.join(dest, ".git"), { recursive: true, force: true });
  console.log(`+ ${dir}  ←  ${repo}${sparse?.length ? ` (${sparse.join(", ")})` : ""}`);
}

function mergeIndex(presetDir, name) {
  const src = path.join(presetDir, "INDEX.md");
  if (!fs.existsSync(src)) return;
  const index = path.join(MATERIALS, "INDEX.md");
  const marker = `<!-- preset:${name} -->`;
  const current = fs.existsSync(index) ? fs.readFileSync(index, "utf8") : "# Materials index\n";
  if (current.includes(marker)) return;
  fs.writeFileSync(index, `${current.trimEnd()}\n\n${marker}\n${fs.readFileSync(src, "utf8").trim()}\n`);
  console.log(`• merged ${name} entries into materials/INDEX.md`);
}

if (flag("list") || !target) {
  for (const name of fs.readdirSync(PRESETS)) {
    const file = path.join(PRESETS, name, "preset.json");
    if (fs.existsSync(file)) {
      const p = JSON.parse(fs.readFileSync(file, "utf8"));
      console.log(`${name.padEnd(16)} ${p.description}`);
    }
  }
  if (!target) console.log("\nusage: node scripts/fetch-materials.mjs <preset|git-url> [--into dir] [--sparse a,b] [--keep-git] [--force]");
  process.exit(0);
}

fs.mkdirSync(MATERIALS, { recursive: true });
const presetDir = path.join(PRESETS, target);
if (fs.existsSync(path.join(presetDir, "preset.json"))) {
  const preset = JSON.parse(fs.readFileSync(path.join(presetDir, "preset.json"), "utf8"));
  console.log(`Fetching preset "${target}": ${preset.description}`);
  for (const source of preset.sources) clone(source);
  mergeIndex(presetDir, target);
} else if (/^(https?:\/\/|git@)/.test(target)) {
  const dir = value("into") || path.basename(target).replace(/\.git$/, "");
  clone({ repo: target, dir, sparse: value("sparse")?.split(",").filter(Boolean) });
  console.log("Next: run /ingest so the tutor adds it to materials/INDEX.md.");
} else {
  console.error(`Unknown preset or URL: ${target}. Run with --list to see presets.`);
  process.exit(2);
}
