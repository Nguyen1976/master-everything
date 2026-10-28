// Quiz sets: created by the tutor (/quiz), taken by the learner in the browser.
//
// One JSON file per quiz in learning/quizzes/, holding the questions (with
// their answer keys) and the learner's answers. Every graded answer is also
// recorded through the engine, so quiz results count toward mastery gates
// and land in the question bank like any other attempt.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeQuestion } from "../../tutor/engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENGINE = path.join(ROOT, "tutor", "engine.mjs");
const STATE_FILE = process.env.TUTOR_STATE || path.join(ROOT, "learning", "state.json");
export const QUIZ_DIR = path.join(path.dirname(STATE_FILE), "quizzes");

const OPEN_TYPES = new Set(["short", "code"]);
const ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;

export class QuizError extends Error {}

function engine(args, input) {
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [ENGINE, ...args], { input: input ? JSON.stringify(input) : "", encoding: "utf8", env: process.env });
  } catch (e) {
    stdout = e.stdout;
  }
  const result = JSON.parse(stdout);
  if (!result.ok) throw new QuizError(result.error);
  return result;
}

function file(id) {
  if (!ID_RE.test(id)) throw new QuizError(`invalid quiz id: ${id}`);
  return path.join(QUIZ_DIR, `${id}.json`);
}

function write(quiz) {
  fs.mkdirSync(QUIZ_DIR, { recursive: true });
  const target = file(quiz.id);
  fs.writeFileSync(target + ".tmp", JSON.stringify(quiz, null, 2) + "\n");
  fs.renameSync(target + ".tmp", target);
}

export function getQuiz(id) {
  const target = file(id);
  if (!fs.existsSync(target)) throw new QuizError(`no quiz ${id}`);
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function slugify(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "quiz";
}

// spec: {title, intro?, questions: [{kp|topic, type, question, options?, answer_index?, expected?, accept?, explanation, difficulty?}]}
export function createQuiz(spec) {
  if (!spec?.title) throw new QuizError("quiz needs a title");
  if (!Array.isArray(spec.questions) || !spec.questions.length) throw new QuizError("quiz needs questions");
  const questions = spec.questions.map((q, i) => {
    if (!q.kp && !q.topic) throw new QuizError(`question ${i + 1}: needs kp (objective id) or topic`);
    const { options, expected, error } = normalizeQuestion(q);
    if (error) throw new QuizError(`question ${i + 1}: ${error}`);
    return {
      n: i + 1,
      kp: q.kp || null,
      topic: q.topic || null,
      type: q.type,
      question: q.question,
      options,
      expected,
      accept: q.accept || [],
      explanation: q.explanation,
      difficulty: q.difficulty || "medium",
    };
  });
  const stamp = new Date().toISOString().slice(0, 10);
  let id = `${slugify(spec.title)}-${stamp}`;
  for (let i = 2; fs.existsSync(path.join(QUIZ_DIR, `${id}.json`)); i++) id = `${slugify(spec.title)}-${stamp}-${i}`;
  const quiz = { id, title: spec.title, intro: spec.intro || "", created_at: new Date().toISOString(), questions, answers: {} };
  write(quiz);
  return quiz;
}

// What the browser may see: answer keys and explanations stay hidden until a
// question has been graded.
export function publicQuiz(quiz) {
  const questions = quiz.questions.map((q) => {
    const a = quiz.answers[q.n];
    const base = { n: q.n, kp: q.kp, topic: q.topic, type: q.type, question: q.question, options: q.options, difficulty: q.difficulty };
    if (!a) return { ...base, status: "unanswered" };
    const view = { ...base, status: a.status, answer: a.answer, at: a.at };
    if (a.status === "graded") Object.assign(view, { score: a.score, correct: a.score >= 1, expected: q.expected, explanation: q.explanation, feedback: a.feedback || null });
    return view;
  });
  return { id: quiz.id, title: quiz.title, intro: quiz.intro, created_at: quiz.created_at, questions, summary: summarize(quiz) };
}

export function summarize(quiz) {
  const answers = Object.values(quiz.answers);
  const graded = answers.filter((a) => a.status === "graded");
  return {
    total: quiz.questions.length,
    answered: answers.length,
    graded: graded.length,
    awaiting_review: answers.filter((a) => a.status === "awaiting_review").length,
    score: +graded.reduce((s, a) => s + a.score, 0).toFixed(2),
  };
}

function recordAttempt(quiz, q, answer, score) {
  return engine(["record", "-"], {
    kp: q.kp,
    topic: q.topic,
    type: q.type,
    question: q.question,
    options: q.options,
    expected: q.expected,
    accept: q.accept,
    explanation: q.explanation,
    difficulty: q.difficulty,
    learner_answer: answer,
    score,
    via: "quiz",
    quiz: quiz.id,
  });
}

// answers: {"<n>": "<answer>"}; already-answered questions are ignored, blank
// answers stay unanswered so the learner can come back to them.
export function submitAnswers(id, answers) {
  const quiz = getQuiz(id);
  for (const q of quiz.questions) {
    const raw = answers?.[q.n] ?? answers?.[String(q.n)];
    if (quiz.answers[q.n] || raw == null || !String(raw).trim()) continue;
    const answer = String(raw).slice(0, 20000);
    const at = new Date().toISOString();
    if (OPEN_TYPES.has(q.type)) {
      quiz.answers[q.n] = { answer, status: "awaiting_review", at };
    } else {
      const result = recordAttempt(quiz, q, answer);
      quiz.answers[q.n] = { answer, status: "graded", score: result.score, attempt: result.attempt, at };
    }
  }
  write(quiz);
  return publicQuiz(quiz);
}

// The tutor's verdict on an open answer.
export function reviewAnswer(id, n, score, feedback) {
  const quiz = getQuiz(id);
  const q = quiz.questions.find((x) => x.n === Number(n));
  if (!q) throw new QuizError(`quiz ${id} has no question ${n}`);
  const a = quiz.answers[q.n];
  if (!a) throw new QuizError(`question ${n} has not been answered yet`);
  if (a.status === "graded") throw new QuizError(`question ${n} is already graded`);
  const value = Number(score);
  if (!(value >= 0 && value <= 1)) throw new QuizError("score must be between 0 and 1");
  const result = recordAttempt(quiz, q, a.answer, value);
  Object.assign(a, { status: "graded", score: value, attempt: result.attempt, feedback: feedback || null, graded_at: new Date().toISOString() });
  write(quiz);
  return result;
}

export function listQuizzes() {
  if (!fs.existsSync(QUIZ_DIR)) return [];
  return fs
    .readdirSync(QUIZ_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, f), "utf8")))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((quiz) => ({ id: quiz.id, title: quiz.title, created_at: quiz.created_at, ...summarize(quiz) }));
}
