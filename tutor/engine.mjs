#!/usr/bin/env node
// Master Everything — mastery engine.
//
// A dependency-free, single-file CLI that owns the learning policy. The tutor
// (Claude Code) never decides on its own whether an objective is mastered: it
// records evidence here and reads the verdict back.
//
// Usage: node tutor/engine.mjs <command> [args]   (JSON input via stdin with "-")
// Run `node tutor/engine.mjs help` for the command list; see guide/ENGINE.md.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = process.env.TUTOR_STATE || path.join(ROOT, "learning", "state.json");

// --- Pedagogy constants --------------------------------------------------

// policy.py: memory/procedure need recency-weighted accuracy >= 0.9;
// concept/design are gated qualitatively (Feynman explanation).
const QUANTITATIVE_GATE = { memory: 0.9, procedure: 0.9 };
const QUALITATIVE_TYPES = new Set(["concept", "design"]);
const KP_TYPES = ["memory", "procedure", "concept", "design"];

// mastery.py: newer attempts count more; 1-2 attempts can never "master".
const RECENCY_WEIGHTS = [0.5, 0.7, 0.85, 0.95, 1.0];
const CONFIDENCE_CAP = { 1: 0.5, 2: 0.8 };

// scheduler.py: review intervals in days per knowledge type
// (memory's leading 0 dropped — mastering it already counts as today's review).
const INTERVALS = {
  memory: [1, 3, 7, 14, 30, 60],
  concept: [3, 7, 14, 30],
  procedure: [3, 7, 14],
  design: [14, 28],
};
const DAY = 24 * 60 * 60 * 1000;

const QUESTION_TYPES = ["choice", "tf", "fill", "short", "code"];
const MODES = ["outline", "study", "review"];

// --- Learner-facing strings -------------------------------------------------
// Cards and maps are printed verbatim to the learner, so they follow
// profile.language. Add a language by adding a table here.

const STRINGS = {
  en: {
    question: "Question",
    difficulty: "difficulty",
    answerChoice: "Answer with a letter (A/B/C/D).",
    answerTf: "Answer: True or False (add your reasoning if you like).",
    answerFill: "Fill in the blank `____`.",
    answerCode: "Answer with code (you can run it in `practice/`).",
    goal: "Goal",
    progress: "Progress",
    objectives: "objectives",
    dueReview: "🔁 review due",
    current: "👉 current",
    feynmanPrompt: "Explain it in your own words",
  },
  vi: {
    question: "Câu hỏi",
    difficulty: "độ khó",
    answerChoice: "Trả lời bằng chữ cái (A/B/C/D).",
    answerTf: "Trả lời: Đúng hoặc Sai (kèm lý do nếu muốn).",
    answerFill: "Điền vào chỗ trống `____`.",
    answerCode: "Viết code trả lời (có thể chạy thử trong `practice/`).",
    goal: "Mục tiêu",
    progress: "Tiến độ",
    objectives: "mục tiêu",
    dueReview: "🔁 đến hạn ôn",
    current: "👉 đang học",
    feynmanPrompt: "Giải thích bằng lời của bạn",
  },
};

function t(state) {
  const lang = String(state.profile?.language || "en").slice(0, 2).toLowerCase();
  return STRINGS[lang] || STRINGS.en;
}

// --- State ------------------------------------------------------------------

function emptyState() {
  return {
    version: 1,
    profile: {},
    mode: "outline",
    current_path: null,
    paths: {},
    attempts: [],
    qualitative: {},
    mastered: {},
    deferred: [],
    explained: {},
    reviews: {},
    pending: null,
    counters: { attempt: 0, question: 0 },
  };
}

function load() {
  if (!fs.existsSync(STATE_FILE)) return emptyState();
  return { ...emptyState(), ...JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) };
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  const tmp = STATE_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  fs.renameSync(tmp, STATE_FILE);
}

function fail(message) {
  console.log(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exit(2);
}

function out(obj) {
  console.log(typeof obj === "string" ? obj : JSON.stringify(obj, null, 2));
}

function readStdinJson() {
  const raw = fs.readFileSync(0, "utf8").trim();
  if (!raw) fail("expected JSON on stdin");
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`invalid JSON on stdin: ${e.message}`);
  }
}

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else flags[key] = args[++i];
    } else rest.push(a);
  }
  return { flags, rest };
}

// --- Lookups ----------------------------------------------------------------

function currentPath(state) {
  const p = state.paths[state.current_path];
  if (!p) fail("no current roadmap — create one with `build -` in outline mode");
  return p;
}

function allKps(p) {
  return p.modules.flatMap((m) => m.kps.map((kp) => ({ ...kp, module_id: m.id, module_name: m.name })));
}

function findKp(state, kpId) {
  for (const p of Object.values(state.paths)) {
    const kp = allKps(p).find((k) => k.id === kpId);
    if (kp) return { kp, path: p };
  }
  fail(`unknown objective id: ${kpId}`);
}

// --- Policy -----------------------------------------------------------------

export function computeMastery(correctness) {
  if (!correctness.length) return 0;
  const recent = correctness.slice(-RECENCY_WEIGHTS.length);
  const weights = RECENCY_WEIGHTS.slice(-recent.length);
  const score =
    recent.reduce((s, c, i) => s + weights[i] * Math.max(0, Math.min(1, c)), 0) /
    weights.reduce((a, b) => a + b, 0);
  return Math.min(score, CONFIDENCE_CAP[recent.length] ?? 1);
}

function gateAttempts(state, kpId) {
  return state.attempts.filter((a) => a.kp === kpId && !a.voided && !a.review);
}

function masteryLevel(state, kp) {
  if (QUALITATIVE_TYPES.has(kp.type)) return state.qualitative[kp.id]?.passed ? 1 : 0;
  // Answers that leaned on hints count for half (assisted practice
  // is weaker evidence than independent recall).
  return computeMastery(gateAttempts(state, kp.id).map((a) => (a.hints ? a.score * 0.5 : a.score)));
}

function isMastered(state, kp) {
  return Boolean(state.mastered[kp.id]);
}

function learningStage(state, kp) {
  const attempts = gateAttempts(state, kp.id);
  const qual = state.qualitative[kp.id];
  if (attempts.some((a) => a.score >= 1 && !a.hints) || (qual?.passed && !qual.hints))
    return "independently_demonstrated";
  if (attempts.some((a) => a.hints) || qual?.hints) return "practiced_with_help";
  if (attempts.length || qual) return "practiced_not_demonstrated";
  if (state.explained[kp.id]) return "partially_explained";
  return "not_yet_covered";
}

function objectiveStatus(state, kp) {
  if (isMastered(state, kp)) return "mastered";
  if (state.deferred.includes(kp.id)) return "deferred";
  if (gateAttempts(state, kp.id).length || state.qualitative[kp.id]) return "learning";
  return "new";
}

function dueReviews(state, now = Date.now()) {
  return Object.entries(state.reviews)
    .filter(([, r]) => r.due_at <= now)
    .sort(([, a], [, b]) => a.due_at - b.due_at)
    .map(([kpId, r]) => {
      const { kp } = findKp(state, kpId);
      return { id: kpId, name: kp.name, type: kp.type, step: r.step, overdue_days: +((now - r.due_at) / DAY).toFixed(1) };
    });
}

function nextObjective(state, p) {
  for (const kp of allKps(p)) {
    if (isMastered(state, kp) || state.deferred.includes(kp.id)) continue;
    const touched = learningStage(state, kp) !== "not_yet_covered";
    let action;
    if (touched) action = QUALITATIVE_TYPES.has(kp.type) ? "assess" : "practice";
    else action = state.profile.teaching_strategy === "teach_first" ? "teach" : "probe";
    return {
      id: kp.id,
      name: kp.name,
      type: kp.type,
      module: kp.module_name,
      module_objective: p.modules.find((m) => m.id === kp.module_id).objective,
      sources: kp.sources || [],
      action,
      stage: learningStage(state, kp),
      mastery: +masteryLevel(state, kp).toFixed(2),
      gate: QUALITATIVE_TYPES.has(kp.type) ? "feynman explanation (assess)" : QUANTITATIVE_GATE[kp.type],
      attempts: gateAttempts(state, kp.id).length,
      explained: state.explained[kp.id] || null,
    };
  }
  return null;
}

// Re-evaluate the gate after new evidence; mastery is sticky once earned and
// starts the spaced-repetition schedule.
function refreshGate(state, kp) {
  if (isMastered(state, kp)) return false;
  const passed = QUALITATIVE_TYPES.has(kp.type)
    ? Boolean(state.qualitative[kp.id]?.passed)
    : masteryLevel(state, kp) >= QUANTITATIVE_GATE[kp.type];
  if (!passed) return false;
  state.mastered[kp.id] = { at: Date.now(), source: "system" };
  state.deferred = state.deferred.filter((id) => id !== kp.id);
  state.reviews[kp.id] = { step: 0, due_at: Date.now() + INTERVALS[kp.type][0] * DAY };
  return true;
}

function scheduleReview(state, kp, correct) {
  const seq = INTERVALS[kp.type];
  const r = state.reviews[kp.id] || { step: 0 };
  // Pass → next, longer interval. Fail → back to the shortest one.
  r.step = correct ? Math.min(r.step + 1, seq.length - 1) : 0;
  r.due_at = Date.now() + (correct ? seq[r.step] : Math.min(1, seq[0])) * DAY;
  r.last = correct ? "pass" : "fail";
  state.reviews[kp.id] = r;
  return r;
}

// --- Rendering --------------------------------------------------------------

function bar(v) {
  const n = Math.round(v * 10);
  return "█".repeat(n) + "░".repeat(10 - n);
}

function renderCard(state, q) {
  const s = t(state);
  const lines = [`**❓ ${s.question} ${q.id}** · ${q.kp_name} · ${s.difficulty}: ${q.difficulty}`, "", q.question];
  if (q.type === "choice") {
    lines.push("");
    for (const o of q.options) lines.push(`- **${o.label}.** ${o.body}`);
    lines.push("", `_${s.answerChoice}_`);
  } else if (q.type === "tf") lines.push("", `_${s.answerTf}_`);
  else if (q.type === "fill") lines.push("", `_${s.answerFill}_`);
  else if (q.type === "code") lines.push("", `_${s.answerCode}_`);
  return lines.join("\n");
}

function renderMap(state, p) {
  const s = t(state);
  const lines = [`# 🗺️ ${p.name}`, "", `> ${s.goal}: ${p.goal}`, ""];
  const kps = allKps(p);
  const mastered = kps.filter((k) => isMastered(state, k)).length;
  lines.push(`**${s.progress}:** ${mastered}/${kps.length} ${s.objectives}  ${bar(kps.length ? mastered / kps.length : 0)}`, "");
  const due = new Set(dueReviews(state).map((d) => d.id));
  const next = nextObjective(state, p);
  for (const m of p.modules) {
    lines.push(`## ${m.name}`, `_${m.objective}_`, "");
    for (const kp of m.kps) {
      const st = objectiveStatus(state, kp);
      const icon = { mastered: "✅", learning: "🟡", new: "⬜", deferred: "⏸️" }[st];
      const extra = [];
      if (st === "learning" && !QUALITATIVE_TYPES.has(kp.type)) extra.push(`${Math.round(masteryLevel(state, kp) * 100)}%`);
      if (due.has(kp.id)) extra.push(s.dueReview);
      if (next && next.id === kp.id) extra.push(s.current);
      lines.push(`- ${icon} \`${kp.id}\` ${kp.name} _(${kp.type})_ ${extra.join(" · ")}`.trimEnd());
    }
    lines.push("");
  }
  return lines.join("\n");
}

function normalizeTf(s) {
  const v = s.trim().toLowerCase();
  if (["true", "t", "yes", "y", "1", "đúng", "dung", "đ", "d"].includes(v)) return "true";
  if (["false", "f", "no", "n", "0", "sai", "s"].includes(v)) return "false";
  return null;
}

// --- Commands ---------------------------------------------------------------

function validateModules(modules) {
  if (!Array.isArray(modules) || !modules.length) fail("modules must be a non-empty array");
  const ids = new Set();
  for (const m of modules) {
    if (!m.id || !m.name || !m.objective) fail(`module needs id, name, objective: ${JSON.stringify(m).slice(0, 120)}`);
    if (!Array.isArray(m.kps) || !m.kps.length) fail(`module ${m.id} needs kps`);
    for (const kp of m.kps) {
      if (!kp.id || !kp.name) fail(`objective needs id and name in module ${m.id}`);
      if (!KP_TYPES.includes(kp.type)) fail(`objective ${kp.id}: type must be one of ${KP_TYPES.join("|")}`);
      if (ids.has(kp.id)) fail(`duplicate objective id: ${kp.id}`);
      ids.add(kp.id);
    }
  }
}

const commands = {
  help() {
    out(`Master Everything — mastery engine (state: ${path.relative(ROOT, STATE_FILE)})

  status                         snapshot: mode, profile, next objective, pending question, due reviews
  map                            markdown progress map of the current roadmap
  paths | switch <pathId>        list roadmaps / change the current roadmap
  mode <outline|study|review>    change session mode
  profile -                      merge learner profile fields (stdin JSON)
  build - [--replace]            create a roadmap (stdin {id,name,goal,modules:[{id,name,objective,materials,kps:[{id,name,type,sources}]}]})
  revise <moduleId> -            replace one module (mastered objectives must be kept unchanged)
  order <modId,modId,...>        reorder modules
  explained <kpId> -             record a delivered explanation (stdin {"quote": "..."})
  quiz - [--replace]             register a question card (stdin {kp|topic,type,question,options?,answer_index?,expected,accept?,explanation,difficulty,shuffle?})
                                 types: choice | tf | fill | short | code; kp counts toward the gate, topic is free practice
  show                           re-print the pending question card
  grade [--answer X] [--score 0..1] [--hints] [--learner "text"]
                                 grade the pending question
  assess <kpId> pass|fail [--hints] -   qualitative gate for concept/design (stdin {"feedback": "...", "learner_quote": "..."})
  skip                           drop the pending question (no credit)
  defer <kpId> | undefer <kpId>  set an objective aside without mastering it
  repair <attemptId> void|correct   invalidate a wrong-key attempt, or mark it correct
  bank [--wrong] [--kp id] [--limit n]   question bank (past attempts with explanations)
  reviews                        due spaced-repetition items`);
  },

  status() {
    const state = load();
    const p = state.paths[state.current_path] || null;
    const snap = {
      ok: true,
      mode: state.mode,
      intake_needed: !state.profile || Object.keys(state.profile).length === 0,
      profile: state.profile,
      path: p ? { id: p.id, name: p.name, goal: p.goal } : null,
      paths: Object.keys(state.paths),
      pending_question: state.pending
        ? { id: state.pending.id, kp: state.pending.kp, type: state.pending.type, asked_at: new Date(state.pending.asked_at).toISOString() }
        : null,
      due_reviews: dueReviews(state),
    };
    if (p) {
      const kps = allKps(p);
      snap.next = nextObjective(state, p);
      snap.complete = !snap.next && kps.every((k) => isMastered(state, k));
      snap.summary = {
        total: kps.length,
        mastered: kps.filter((k) => isMastered(state, k)).length,
        learning: kps.filter((k) => objectiveStatus(state, k) === "learning").length,
        deferred: state.deferred.length,
      };
    } else snap.status = "empty";
    out(snap);
  },

  map() {
    const state = load();
    out(renderMap(state, currentPath(state)));
  },

  paths() {
    const state = load();
    out(
      Object.values(state.paths).map((p) => {
        const kps = allKps(p);
        return { id: p.id, name: p.name, current: p.id === state.current_path, mastered: kps.filter((k) => isMastered(state, k)).length, total: kps.length };
      }),
    );
  },

  switch([id]) {
    const state = load();
    if (!state.paths[id]) fail(`no roadmap ${id}; known: ${Object.keys(state.paths).join(", ")}`);
    state.current_path = id;
    save(state);
    out({ ok: true, current_path: id });
  },

  mode([m]) {
    if (!MODES.includes(m)) fail(`mode must be one of ${MODES.join("|")}`);
    const state = load();
    state.mode = m;
    save(state);
    out({ ok: true, mode: m });
  },

  profile() {
    const patch = readStdinJson();
    const state = load();
    state.profile = { ...state.profile, ...patch, updated_at: new Date().toISOString() };
    save(state);
    out({ ok: true, profile: state.profile });
  },

  build(args) {
    const { flags } = parseFlags(args);
    const spec = readStdinJson();
    if (!spec.id || !spec.name || !spec.goal) fail("roadmap needs id, name, goal");
    validateModules(spec.modules);
    const state = load();
    if (state.paths[spec.id] && !flags.replace) fail(`roadmap ${spec.id} exists — use \`revise\` for edits, or --replace to rebuild`);
    if (state.paths[spec.id]) {
      const newIds = new Set(spec.modules.flatMap((m) => m.kps.map((k) => k.id)));
      const lost = allKps(state.paths[spec.id]).filter((k) => isMastered(state, k) && !newIds.has(k.id));
      if (lost.length) fail(`rebuild would drop mastered objectives: ${lost.map((k) => k.id).join(", ")}`);
    }
    state.paths[spec.id] = { id: spec.id, name: spec.name, goal: spec.goal, modules: spec.modules, created_at: new Date().toISOString() };
    state.current_path = spec.id;
    save(state);
    out({ ok: true, path: spec.id, modules: spec.modules.length, objectives: spec.modules.reduce((n, m) => n + m.kps.length, 0) });
  },

  revise([moduleId]) {
    const mod = readStdinJson();
    const state = load();
    const p = currentPath(state);
    const idx = p.modules.findIndex((m) => m.id === moduleId);
    if (idx < 0) fail(`no module ${moduleId} in ${p.id}`);
    mod.id = moduleId;
    validateModules([mod]);
    const old = p.modules[idx];
    const reset = [];
    for (const kp of old.kps) {
      const replacement = mod.kps.find((k) => k.id === kp.id);
      if (isMastered(state, kp)) {
        if (!replacement || replacement.name !== kp.name || replacement.type !== kp.type)
          fail(`objective ${kp.id} is mastered — keep it unchanged and add a new objective instead`);
      } else if (replacement && (replacement.name !== kp.name || replacement.type !== kp.type)) {
        // Rewriting a knowledge point resets its progress.
        state.attempts.forEach((a) => a.kp === kp.id && (a.voided = true));
        delete state.qualitative[kp.id];
        reset.push(kp.id);
      }
    }
    const otherIds = new Set(p.modules.filter((_, i) => i !== idx).flatMap((m) => m.kps.map((k) => k.id)));
    const clash = mod.kps.find((k) => otherIds.has(k.id));
    if (clash) fail(`objective id ${clash.id} already used in another module`);
    p.modules[idx] = mod;
    save(state);
    out({ ok: true, module: moduleId, reset_progress: reset });
  },

  order([csv]) {
    const state = load();
    const p = currentPath(state);
    const ids = (csv || "").split(",").map((s) => s.trim()).filter(Boolean);
    const current = p.modules.map((m) => m.id);
    if (ids.length !== current.length || !current.every((id) => ids.includes(id)))
      fail(`order must list every module exactly once: ${current.join(",")}`);
    p.modules = ids.map((id) => p.modules.find((m) => m.id === id));
    save(state);
    out({ ok: true, order: ids });
  },

  explained([kpId]) {
    const { quote } = readStdinJson();
    if (!quote) fail('explained needs {"quote": "<exact sentence you delivered>"}');
    const state = load();
    findKp(state, kpId);
    state.explained[kpId] = { quote: String(quote).slice(0, 400), at: new Date().toISOString(), coverage: "partial" };
    save(state);
    out({ ok: true, kp: kpId, stage: "partially_explained" });
  },

  quiz(args) {
    const { flags } = parseFlags(args);
    const q = readStdinJson();
    const state = load();
    if (state.pending && !flags.replace)
      fail(`question ${state.pending.id} is still open — grade it, \`skip\` it, or pass --replace on an explicit learner request`);
    // Free practice (/quiz on a topic outside the roadmap) has no objective and
    // never moves a gate; it still lands in the question bank.
    if (!q.kp && !q.topic) fail("quiz needs kp (objective id) or topic (free practice)");
    const kp = q.kp ? findKp(state, q.kp).kp : null;
    if (!QUESTION_TYPES.includes(q.type)) fail(`type must be one of ${QUESTION_TYPES.join("|")}`);
    if (!q.question || !q.explanation) fail("question and explanation are required");
    if (kp && state.mode === "review" && !isMastered(state, kp)) fail(`review mode only re-tests mastered objectives; ${kp.id} is not mastered`);
    let options = null;
    let expected = q.expected;
    if (q.type === "choice") {
      if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4) fail("choice needs 3-4 options (array of strings)");
      if (!Number.isInteger(q.answer_index) || !q.options[q.answer_index]) fail("choice needs answer_index (0-based)");
      // Shuffle so the correct answer's position carries no signal — unless the
      // learner already saw these labels (a grouped /quiz set recorded afterwards).
      const order = q.options.map((_, i) => i);
      if (q.shuffle !== false) {
        for (let i = order.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
      }
      options = order.map((orig, i) => ({ label: "ABCD"[i], body: String(q.options[orig]).replace(/^[A-D][.)]\s*/, "") }));
      expected = options[order.indexOf(q.answer_index)].label;
    } else if (q.type === "tf") {
      expected = normalizeTf(String(q.expected));
      if (!expected) fail("tf needs expected: true|false");
    } else if (!expected) fail("expected answer is required");
    state.counters.question += 1;
    state.pending = {
      id: `q${state.counters.question}`,
      kp: kp?.id ?? null,
      kp_name: kp?.name ?? q.topic,
      topic: q.topic || null,
      type: q.type,
      question: q.question,
      options,
      expected,
      accept: q.accept || [],
      explanation: q.explanation,
      difficulty: q.difficulty || "medium",
      review: kp ? isMastered(state, kp) : false,
      asked_at: Date.now(),
    };
    save(state);
    out(renderCard(state, state.pending));
  },

  show() {
    const state = load();
    if (!state.pending) fail("no pending question");
    out(renderCard(state, state.pending));
  },

  grade(args) {
    const { flags } = parseFlags(args);
    const state = load();
    const q = state.pending;
    if (!q) fail("no pending question to grade");
    let score;
    if (flags.score !== undefined && flags.score !== true) {
      score = Number(flags.score);
      if (!(score >= 0 && score <= 1)) fail("--score must be between 0 and 1");
    } else if (flags.answer !== undefined && flags.answer !== true) {
      const ans = String(flags.answer).trim();
      if (q.type === "choice") score = ans.toUpperCase().replace(/[^A-D]/g, "").slice(0, 1) === q.expected ? 1 : 0;
      else if (q.type === "tf") score = normalizeTf(ans) === q.expected ? 1 : 0;
      else if (q.type === "fill") {
        const norm = (s) => String(s).trim().toLowerCase().replace(/[`'"]/g, "");
        score = [q.expected, ...q.accept].map(norm).includes(norm(ans)) ? 1 : 0;
      } else fail(`${q.type} questions need --score (judge the answer against the reference)`);
    } else fail("pass --answer <learner answer> (choice/tf/fill) or --score 0..1");

    const kp = q.kp ? findKp(state, q.kp).kp : null;
    state.counters.attempt += 1;
    const attempt = {
      id: `a${state.counters.attempt}`,
      question_id: q.id,
      kp: q.kp,
      topic: q.topic,
      type: q.type,
      question: q.question,
      options: q.options,
      expected: q.expected,
      explanation: q.explanation,
      difficulty: q.difficulty,
      learner_answer: flags.learner || flags.answer || null,
      score,
      hints: Boolean(flags.hints),
      review: q.review,
      at: new Date().toISOString(),
    };
    state.attempts.push(attempt);
    state.pending = null;

    const result = { ok: true, attempt: attempt.id, correct: score >= 1, score, expected: q.expected, explanation: q.explanation };
    if (!kp) {
      result.free_practice = true;
    } else if (q.review) {
      const r = scheduleReview(state, kp, score >= 0.75);
      result.review = { next_due: new Date(r.due_at).toISOString().slice(0, 10), step: r.step };
    } else {
      result.newly_mastered = refreshGate(state, kp);
      result.mastered = isMastered(state, kp);
      result.mastery = +masteryLevel(state, kp).toFixed(2);
      result.gate = QUANTITATIVE_GATE[kp.type] ?? "qualitative";
      result.attempts_on_objective = gateAttempts(state, kp.id).length;
    }
    save(state);
    const p = state.paths[state.current_path];
    if (p) result.next = nextObjective(state, p)?.id ?? null;
    out(result);
  },

  assess(args) {
    const { flags, rest } = parseFlags(args);
    const [kpId, verdict] = rest;
    if (!["pass", "fail"].includes(verdict)) fail("assess <kpId> pass|fail -");
    const body = readStdinJson();
    const state = load();
    const { kp } = findKp(state, kpId);
    if (!QUALITATIVE_TYPES.has(kp.type)) fail(`${kpId} is ${kp.type} — use quiz + grade instead`);
    const passed = verdict === "pass";
    const review = isMastered(state, kp);
    state.counters.attempt += 1;
    state.attempts.push({
      id: `a${state.counters.attempt}`,
      kp: kpId,
      type: "feynman",
      question: t(state).feynmanPrompt,
      learner_answer: body.learner_quote || null,
      explanation: body.feedback || "",
      score: passed ? 1 : 0,
      hints: Boolean(flags.hints),
      review,
      at: new Date().toISOString(),
    });
    const result = { ok: true, kp: kpId, passed };
    if (review) {
      const r = scheduleReview(state, kp, passed);
      result.review = { next_due: new Date(r.due_at).toISOString().slice(0, 10), step: r.step };
    } else {
      // An explanation leaning on hints is not independent evidence.
      state.qualitative[kpId] = { passed: passed && !flags.hints, hints: Boolean(flags.hints), feedback: body.feedback || "", at: new Date().toISOString() };
      result.newly_mastered = refreshGate(state, kp);
      result.mastered = isMastered(state, kp);
    }
    save(state);
    const p = state.paths[state.current_path];
    if (p) result.next = nextObjective(state, p)?.id ?? null;
    out(result);
  },

  skip() {
    const state = load();
    if (!state.pending) fail("no pending question");
    const id = state.pending.id;
    state.pending = null;
    save(state);
    out({ ok: true, skipped: id, credit: "none" });
  },

  defer([kpId]) {
    const state = load();
    findKp(state, kpId);
    if (!state.deferred.includes(kpId)) state.deferred.push(kpId);
    if (state.pending?.kp === kpId) state.pending = null;
    save(state);
    out({ ok: true, deferred: kpId, mastered: false });
  },

  undefer([kpId]) {
    const state = load();
    state.deferred = state.deferred.filter((id) => id !== kpId);
    save(state);
    out({ ok: true, undeferred: kpId });
  },

  repair([attemptId, action]) {
    const state = load();
    const a = state.attempts.find((x) => x.id === attemptId);
    if (!a) fail(`no attempt ${attemptId}`);
    if (action === "void") a.voided = true;
    else if (action === "correct") a.score = 1;
    else fail("repair <attemptId> void|correct");
    a.repaired = action;
    if (!a.kp) {
      save(state);
      return out({ ok: true, attempt: attemptId, action, free_practice: true });
    }
    const { kp } = findKp(state, a.kp);
    const newlyMastered = refreshGate(state, kp);
    save(state);
    out({ ok: true, attempt: attemptId, action, mastery: +masteryLevel(state, kp).toFixed(2), newly_mastered: newlyMastered });
  },

  bank(args) {
    const { flags } = parseFlags(args);
    const state = load();
    let rows = state.attempts.filter((a) => !a.voided);
    if (flags.wrong) rows = rows.filter((a) => a.score < 1);
    if (flags.kp) rows = rows.filter((a) => a.kp === flags.kp);
    rows = rows.slice(-(Number(flags.limit) || 20));
    out(rows.map(({ id, kp, topic, type, question, options, expected, learner_answer, score, explanation, at }) => ({ id, kp, topic, type, question, options, expected, learner_answer, score, explanation, at })));
  },

  reviews() {
    out(dueReviews(load()));
  },
};

// Only run the CLI when executed directly, so tests can import computeMastery.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || !commands[cmd]) {
    commands.help();
    process.exit(cmd ? 2 : 0);
  }
  commands[cmd](args);
}
