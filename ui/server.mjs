#!/usr/bin/env node
// Local web UI for Master Everything: the dashboard and quiz pages.
//
//   node ui/server.mjs                      run in the foreground
//   node ui/server.mjs --ensure [--open P]  start in the background if needed, print the URL
//                                           (and open path P, e.g. / or /quiz/<id>, in the browser)
//
// Binds to 127.0.0.1 only. All learning logic stays in tutor/engine.mjs; this
// server reads snapshots from it and forwards the learner's answers to it.

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QUIZ_DIR, QuizError, getQuiz, listQuizzes, publicQuiz, submitAnswers } from "./lib/quizzes.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "ui", "public");
const ENGINE = path.join(ROOT, "tutor", "engine.mjs");
const STATE_FILE = process.env.TUTOR_STATE || path.join(ROOT, "learning", "state.json");
const LEARNING = path.dirname(STATE_FILE);
const RUNTIME = path.join(LEARNING, ".ui.json");
const HOST = "127.0.0.1";
const BASE_PORT = Number(process.env.ME_PORT || 4747);
const APP = "master-everything";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };

function engine(args) {
  let stdout;
  try {
    stdout = execFileSync(process.execPath, [ENGINE, ...args], { encoding: "utf8", env: process.env });
  } catch (e) {
    stdout = e.stdout;
  }
  return JSON.parse(stdout);
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function serveFile(res, rel) {
  const target = path.resolve(PUBLIC, rel);
  if (!target.startsWith(PUBLIC + path.sep) || !fs.existsSync(target)) return send(res, 404, { ok: false, error: "not found" });
  send(res, 200, fs.readFileSync(target), TYPES[path.extname(target)] || "application/octet-stream");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > 1_000_000) reject(new QuizError("request too large"));
      else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new QuizError("invalid JSON"));
      }
    });
  });
}

// Writes must come from our own pages: a custom header cannot be sent
// cross-site without a CORS preflight, which this server never approves.
function trustedWrite(req) {
  if (req.headers["x-master-everything"] !== "1") return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return [HOST, "localhost"].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

// --- Live updates: one SSE stream per open page, pinged when learning/ changes.
const clients = new Set();
let timer = null;
function broadcast() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const res of clients) res.write(`event: change\ndata: ${Date.now()}\n\n`);
  }, 120);
}
function watch() {
  fs.mkdirSync(QUIZ_DIR, { recursive: true });
  for (const dir of [LEARNING, QUIZ_DIR]) {
    try {
      fs.watch(dir, (_, name) => name && !String(name).startsWith(".ui") && broadcast());
    } catch {
      /* watching is a nicety; pages also refresh on focus */
    }
  }
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${HOST}`);
  const p = url.pathname;
  try {
    if (req.method === "GET") {
      if (p === "/" || p === "/index.html") return serveFile(res, "index.html");
      if (/^\/quiz\/[a-z0-9-]+\/?$/.test(p)) return serveFile(res, "quiz.html");
      if (p.startsWith("/assets/")) return serveFile(res, p.slice("/assets/".length));
      if (p === "/api/health") return send(res, 200, { ok: true, app: APP, root: ROOT });
      if (p === "/api/snapshot") return send(res, 200, { ...engine(["snapshot"]), quizzes: listQuizzes() });
      const m = p.match(/^\/api\/quiz\/([a-z0-9-]+)$/);
      if (m) return send(res, 200, { ok: true, language: engine(["snapshot"]).language, quiz: publicQuiz(getQuiz(m[1])) });
      if (p === "/api/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        res.write("retry: 3000\n\n");
        clients.add(res);
        req.on("close", () => clients.delete(res));
        return;
      }
      return send(res, 404, { ok: false, error: "not found" });
    }
    if (req.method === "POST") {
      if (!trustedWrite(req)) return send(res, 403, { ok: false, error: "forbidden" });
      const body = await readBody(req);
      const m = p.match(/^\/api\/quiz\/([a-z0-9-]+)\/submit$/);
      if (m) return send(res, 200, { ok: true, quiz: submitAnswers(m[1], body.answers || {}) });
      if (p === "/api/question/answer") {
        const answer = String(body.answer ?? "").trim();
        if (!answer) return send(res, 400, { ok: false, error: "empty answer" });
        const pending = engine(["status"]).pending_question;
        if (!pending || pending.id !== body.id) return send(res, 409, { ok: false, error: "that question is no longer open" });
        const closed = ["choice", "tf", "fill"].includes(pending.type);
        const result = closed ? engine(["grade", "--answer", answer, "--via", "ui"]) : engine(["answer", "--text", answer, "--via", "ui"]);
        return send(res, result.ok ? 200 : 400, result);
      }
      return send(res, 404, { ok: false, error: "not found" });
    }
    send(res, 405, { ok: false, error: "method not allowed" });
  } catch (e) {
    send(res, e instanceof QuizError ? 400 : 500, { ok: false, error: e.message });
  }
}

// --- Process management ------------------------------------------------------

async function health(port) {
  try {
    const r = await fetch(`http://${HOST}:${port}/api/health`, { signal: AbortSignal.timeout(800) });
    const body = await r.json();
    return body.app === APP ? body : null;
  } catch {
    return null;
  }
}

async function findRunning() {
  try {
    const { port } = JSON.parse(fs.readFileSync(RUNTIME, "utf8"));
    const h = await health(port);
    if (h && h.root === ROOT) return port;
  } catch {
    /* not running */
  }
  return null;
}

function openBrowser(url) {
  const [cmd, args] =
    process.platform === "darwin" ? ["open", [url]] : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).on("error", () => {}).unref();
}

function listen(port, attempts = 10) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handle);
    server.once("error", (e) => {
      if (e.code === "EADDRINUSE" && attempts > 1) resolve(listen(port + 1, attempts - 1));
      else reject(e);
    });
    server.listen(port, HOST, () => resolve(port));
  });
}

const args = process.argv.slice(2);
if (args.includes("--ensure")) {
  let port = await findRunning();
  if (!port) {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { stdio: "ignore", detached: true, env: process.env });
    child.unref();
    for (let i = 0; i < 40 && !port; i++) {
      await new Promise((r) => setTimeout(r, 100));
      port = await findRunning();
    }
    if (!port) {
      console.log(JSON.stringify({ ok: false, error: "the UI server did not start; run `node ui/server.mjs` to see why" }));
      process.exit(1);
    }
  }
  const target = args[args.indexOf("--open") + 1];
  const pathPart = args.includes("--open") && target && target.startsWith("/") ? target : "/";
  const url = `http://${HOST}:${port}${pathPart}`;
  if (args.includes("--open")) openBrowser(url);
  console.log(JSON.stringify({ ok: true, url }));
} else {
  const port = await listen(BASE_PORT);
  fs.mkdirSync(LEARNING, { recursive: true });
  fs.writeFileSync(RUNTIME, JSON.stringify({ port, pid: process.pid, root: ROOT }) + "\n");
  watch();
  console.log(`Master Everything UI → http://${HOST}:${port}/`);
}
