// UI server tests: quiz flow, open-question answers, write protection.
// Run with: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "me-ui-"));
const env = { ...process.env, TUTOR_STATE: path.join(dir, "state.json"), ME_PORT: String(46000 + Math.floor(Math.random() * 2000)) };
let server;
let base;

function engine(args, input) {
  const out = execFileSync(process.execPath, [path.join(ROOT, "tutor/engine.mjs"), ...args], { env, input: input ? JSON.stringify(input) : "", encoding: "utf8" });
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}
function quizCli(args, input) {
  return JSON.parse(execFileSync(process.execPath, [path.join(ROOT, "ui/quiz.mjs"), ...args], { env, input: input ? JSON.stringify(input) : "", encoding: "utf8" }));
}
const post = (p, body, headers = { "x-master-everything": "1" }) =>
  fetch(base + p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (p) => fetch(base + p).then((r) => r.json());

before(async () => {
  engine(["profile", "-"], { language: "en" });
  engine(["build", "-"], { id: "demo", name: "Demo", goal: "g", modules: [{ id: "m1", name: "M1", objective: "o", kps: [{ id: "fact", name: "Fact", type: "memory" }, { id: "idea", name: "Idea", type: "concept" }] }] });
  engine(["mode", "study"]);
  server = spawn(process.execPath, [path.join(ROOT, "ui/server.mjs")], { env, stdio: "ignore" });
  for (let i = 0; i < 50 && !base; i++) {
    await new Promise((r) => setTimeout(r, 100));
    try {
      const { port } = JSON.parse(fs.readFileSync(path.join(dir, ".ui.json"), "utf8"));
      const h = await fetch(`http://127.0.0.1:${port}/api/health`).then((r) => r.json());
      if (h.ok) base = `http://127.0.0.1:${port}`;
    } catch {
      /* not up yet */
    }
  }
  assert.ok(base, "server started");
});

after(() => server?.kill());

test("pages and snapshot are served", async () => {
  const html = await fetch(base + "/").then((r) => r.text());
  assert.match(html, /dashboard\.js/);
  const snap = await get("/api/snapshot");
  assert.equal(snap.paths[0].summary.total, 2);
  assert.deepEqual(snap.quizzes, []);
  assert.equal((await fetch(base + "/assets/../engine.mjs")).status, 404);
});

test("quiz: keys stay hidden, closed answers are graded, open ones wait for the tutor", async () => {
  const created = quizCli(["new", "-"], {
    title: "Practice set",
    questions: [
      { kp: "fact", type: "choice", question: "Q1", options: ["right", "w1", "w2"], answer_index: 0, explanation: "e1" },
      { kp: "idea", type: "short", question: "Q2", expected: "ref", explanation: "e2" },
      { topic: "extra", type: "tf", question: "Q3", expected: "false", explanation: "e3" },
    ],
  });
  const view = await get(`/api/quiz/${created.id}`);
  assert.ok(!JSON.stringify(view).includes('"expected"'), "answer keys must not reach the browser");
  const right = view.quiz.questions[0].options.find((o) => o.body === "right").label;

  const r = await post(`/api/quiz/${created.id}/submit`, { answers: { 1: right, 2: "my explanation" } });
  assert.equal(r.status, 200);
  const [q1, q2, q3] = r.body.quiz.questions;
  assert.equal(q1.status, "graded");
  assert.equal(q1.correct, true);
  assert.equal(q1.explanation, "e1");
  assert.equal(q2.status, "awaiting_review");
  assert.equal(q2.expected, undefined);
  assert.equal(q3.status, "unanswered");

  assert.equal(quizCli(["list", "--pending"]).length, 1);
  quizCli(["review", created.id, "2", "0.5", "--feedback", "half right"]);
  const after = await get(`/api/quiz/${created.id}`);
  assert.equal(after.quiz.questions[1].score, 0.5);
  assert.equal(after.quiz.questions[1].feedback, "half right");
  assert.equal(engine(["bank", "--limit", "5"]).filter((a) => a.kp).length, 2, "quiz answers land in the question bank");
});

test("open question: closed types grade in the browser, open types go to the tutor", async () => {
  engine(["quiz", "-"], { kp: "fact", type: "tf", question: "x", expected: "true", explanation: "e" });
  let snap = await get("/api/snapshot");
  assert.equal(snap.pending.expected, undefined);
  const graded = await post("/api/question/answer", { id: snap.pending.id, answer: "true" });
  assert.equal(graded.body.correct, true);
  assert.equal(engine(["status"]).ui_activity.length, 1, "the tutor sees what happened in the browser");
  engine(["ack"]);
  assert.equal(engine(["status"]).ui_activity.length, 0);

  engine(["quiz", "-"], { kp: "fact", type: "short", question: "why", expected: "because", explanation: "e" });
  snap = await get("/api/snapshot");
  const stored = await post("/api/question/answer", { id: snap.pending.id, answer: "because of reasons" });
  assert.equal(stored.body.status, "answered");
  const status = engine(["status"]);
  assert.equal(status.pending_question.status, "answered");
  assert.equal(status.pending_question.learner_answer, "because of reasons");
  const result = engine(["grade", "--score", "1"]);
  assert.equal(result.correct, true);

  const stale = await post("/api/question/answer", { id: snap.pending.id, answer: "again" });
  assert.equal(stale.status, 409);
});

test("writes are refused without the app header or from another origin", async () => {
  assert.equal((await post("/api/question/answer", { id: "q1", answer: "A" }, {})).status, 403);
  assert.equal((await post("/api/question/answer", { id: "q1", answer: "A" }, { "x-master-everything": "1", origin: "https://example.com" })).status, 403);
});
