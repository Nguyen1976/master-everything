#!/usr/bin/env node
// Quiz sets for the tutor (/quiz skill).
//
//   node ui/quiz.mjs new - [--open]          create a quiz from stdin JSON, print its URL (and open it)
//   node ui/quiz.mjs results <id>            the learner's answers, with keys and explanations
//   node ui/quiz.mjs review <id> <n> <score 0..1> [--feedback "..."]
//                                            grade an open (short/code) answer
//   node ui/quiz.mjs list [--pending]        all quizzes, or only those awaiting review
//
// Quiz JSON: {"title": "...", "intro": "...", "questions": [{kp|topic, type, question,
//   options?, answer_index?, expected?, accept?, explanation, difficulty?}]}

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QuizError, createQuiz, getQuiz, listQuizzes, reviewAnswer, summarize } from "./lib/quizzes.mjs";

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), "server.mjs");

function out(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

function ensureServer(open, pathPart) {
  const args = [SERVER, "--ensure"];
  if (open) args.push("--open", pathPart);
  try {
    return JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8", env: process.env }));
  } catch (e) {
    return { ok: false, error: String(e.stdout || e.message).trim() };
  }
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "new") {
    const raw = fs.readFileSync(0, "utf8").trim();
    if (!raw) throw new QuizError("expected quiz JSON on stdin");
    const quiz = createQuiz(JSON.parse(raw));
    const server = ensureServer(rest.includes("--open"), `/quiz/${quiz.id}`);
    const base = server.ok ? new URL(server.url).origin : null;
    out({ ok: true, id: quiz.id, questions: quiz.questions.length, url: base ? `${base}/quiz/${quiz.id}` : null, server_error: server.ok ? undefined : server.error });
  } else if (cmd === "results") {
    const quiz = getQuiz(rest[0]);
    out({
      ok: true,
      id: quiz.id,
      title: quiz.title,
      summary: summarize(quiz),
      questions: quiz.questions.map((q) => ({ ...q, ...(quiz.answers[q.n] ? { learner: quiz.answers[q.n] } : { learner: null }) })),
    });
  } else if (cmd === "review") {
    const [id, n, score] = rest;
    const i = rest.indexOf("--feedback");
    out(reviewAnswer(id, n, score, i >= 0 ? rest[i + 1] : null));
  } else if (cmd === "list") {
    const all = listQuizzes();
    out(rest.includes("--pending") ? all.filter((q) => q.awaiting_review > 0) : all);
  } else {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 12).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(cmd ? 2 : 0);
  }
} catch (e) {
  out({ ok: false, error: e.message });
  process.exit(2);
}
