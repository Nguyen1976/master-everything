// Engine tests. Run with: npm test
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeMastery } from "../engine.mjs";

const ENGINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "engine.mjs");
let stateFile;

// Run one engine command against an isolated state file; returns parsed JSON
// (or raw text for markdown output) and never throws on engine errors.
function run(args, stdin) {
  try {
    const stdout = execFileSync("node", [ENGINE, ...args], {
      input: stdin === undefined ? "" : typeof stdin === "string" ? stdin : JSON.stringify(stdin),
      env: { ...process.env, TUTOR_STATE: stateFile },
      encoding: "utf8",
    });
    try {
      return JSON.parse(stdout);
    } catch {
      return stdout;
    }
  } catch (e) {
    return JSON.parse(e.stdout);
  }
}

const ROADMAP = {
  id: "demo",
  name: "Demo",
  goal: "Test the gate",
  modules: [
    {
      id: "m1",
      name: "Module 1",
      objective: "You can do things.",
      kps: [
        { id: "fact", name: "A fact", type: "memory" },
        { id: "idea", name: "An idea", type: "concept" },
      ],
    },
  ],
};

function askChoice(kp = "fact") {
  run(["quiz", "-"], { kp, type: "choice", question: "Q?", options: ["right", "w1", "w2", "w3"], answer_index: 0, explanation: "because" });
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  return state.pending.options.find((o) => o.body === "right").label;
}

beforeEach(() => {
  stateFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "me-engine-")), "state.json");
  run(["profile", "-"], { language: "en", teaching_strategy: "probe_first" });
  run(["build", "-"], ROADMAP);
  run(["mode", "study"]);
});

test("computeMastery applies recency weights and the confidence cap", () => {
  assert.equal(computeMastery([]), 0);
  assert.equal(computeMastery([1]), 0.5);
  assert.equal(computeMastery([1, 1]), 0.8);
  assert.equal(computeMastery([1, 1, 1]), 1);
  assert.equal(computeMastery([0, 1, 1, 1, 1]), 3.5 / 4);
});

test("a memory objective needs ≥ 0.9 before it is mastered", () => {
  const results = [];
  for (let i = 0; i < 3; i++) results.push(run(["grade", "--answer", askChoice()]));
  assert.deepEqual(results.map((r) => r.mastered), [false, false, true]);
  assert.equal(results[2].newly_mastered, true);
  assert.equal(results[2].next, "idea");
});

test("one early mistake keeps the gate closed until it ages out", () => {
  assert.equal(run(["grade", "--answer", "A"]).ok, false, "nothing to grade yet");
  askChoice();
  assert.equal(run(["grade", "--answer", "Z"]).correct, false);
  // [0,1,1,1,1] scores 0.875; the miss must leave the 5-attempt window first.
  const levels = [];
  for (let i = 0; i < 5; i++) levels.push(run(["grade", "--answer", askChoice()]).mastered);
  assert.deepEqual(levels, [false, false, false, false, true]);
});

test("only one question can be open at a time", () => {
  askChoice();
  const r = run(["quiz", "-"], { kp: "fact", type: "tf", question: "x", expected: "true", explanation: "e" });
  assert.equal(r.ok, false);
  assert.match(r.error, /still open/);
  assert.equal(run(["skip"]).credit, "none");
});

test("open questions require a score, closed ones are auto-graded", () => {
  run(["quiz", "-"], { kp: "fact", type: "short", question: "Why?", expected: "Because.", explanation: "e" });
  assert.equal(run(["grade", "--answer", "foo"]).ok, false);
  assert.equal(run(["grade", "--score", "1", "--learner", "foo"]).score, 1);
  run(["quiz", "-"], { kp: "fact", type: "fill", question: "____", expected: "let", accept: ["const"], explanation: "e" });
  assert.equal(run(["grade", "--answer", "Const"]).correct, true);
});

test("hint-assisted answers count for half", () => {
  for (let i = 0; i < 5; i++) run(["grade", "--answer", askChoice(), "--hints"]);
  assert.equal(run(["status"]).next.mastery, 0.5);
});

test("concept objectives pass only through a Feynman assessment", () => {
  const blocked = run(["assess", "fact", "pass", "-"], { feedback: "x" });
  assert.equal(blocked.ok, false);
  const helped = run(["assess", "idea", "pass", "--hints", "-"], { feedback: "needed hints" });
  assert.equal(helped.mastered, false);
  const solo = run(["assess", "idea", "pass", "-"], { feedback: "clear", learner_quote: "..." });
  assert.equal(solo.newly_mastered, true);
});

test("mastery starts a spaced-review schedule; review mode rejects unmastered objectives", () => {
  run(["assess", "idea", "pass", "-"], { feedback: "clear" });
  run(["mode", "review"]);
  const refused = run(["quiz", "-"], { kp: "fact", type: "tf", question: "x", expected: "true", explanation: "e" });
  assert.match(refused.error, /only re-tests mastered/);
  const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  const days = (state.reviews.idea.due_at - Date.now()) / 86400000;
  assert.ok(days > 2.9 && days <= 3, `concept review should be due in 3 days, got ${days}`);
});

test("revise refuses to rewrite a mastered objective and resets a rewritten one", () => {
  run(["assess", "idea", "pass", "-"], { feedback: "clear" });
  run(["grade", "--answer", askChoice()]);
  const mod = structuredClone(ROADMAP.modules[0]);
  mod.kps[1].name = "Renamed idea";
  assert.match(run(["revise", "m1", "-"], mod).error, /is mastered/);
  const mod2 = structuredClone(ROADMAP.modules[0]);
  mod2.kps[0].name = "Renamed fact";
  assert.deepEqual(run(["revise", "m1", "-"], mod2).reset_progress, ["fact"]);
});

test("free practice lands in the bank without touching any gate", () => {
  run(["quiz", "-"], { topic: "anything", type: "choice", question: "Q", options: ["a", "b", "c"], answer_index: 1, shuffle: false, explanation: "e" });
  const r = run(["grade", "--answer", "B"]);
  assert.equal(r.free_practice, true);
  assert.equal(run(["bank", "--limit", "1"])[0].topic, "anything");
  assert.equal(run(["status"]).summary.learning, 0);
});

test("cards follow the learner's language", () => {
  run(["profile", "-"], { language: "vi" });
  run(["quiz", "-"], { kp: "fact", type: "tf", question: "x", expected: "đúng", explanation: "e" });
  assert.match(run(["show"]), /Câu hỏi/);
  assert.equal(run(["grade", "--answer", "sai"]).correct, false);
});
