// Quiz page: answer a set of questions the tutor created with /quiz.
// Closed questions are graded on submit; written answers go to the tutor.

import { api, esc, icon, liveUpdates, md, meter, setLanguage, t } from "./common.js";

const id = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] || "");
const main = document.getElementById("main");
const bar = document.getElementById("actionbar");
const progress = document.getElementById("progress-text");
const submitBtn = document.getElementById("submit-btn");
document.getElementById("brand-mark").innerHTML = icon("logo");

const DRAFT_KEY = `me-quiz-draft:${id}`;
let quiz = null;
let submitting = false;

// Unsent answers survive a reload; storage can be unavailable, so never rely on it.
function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}
function writeDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function difficultyChip(d) {
  const cls = d === "hard" ? "danger" : d === "easy" ? "success" : "warning";
  return `<span class="chip ${cls}">${esc(t.difficulty[d] || d)}</span>`;
}

function choices(q) {
  if (q.type === "tf") return [{ value: "true", key: "T", body: t.trueLabel }, { value: "false", key: "F", body: t.falseLabel }];
  return q.options.map((o) => ({ value: o.label, key: o.label, body: o.body }));
}

function inputFor(q, draft) {
  const name = `q${q.n}`;
  const value = draft[q.n] ?? "";
  if (q.type === "choice" || q.type === "tf") {
    return `<div class="options" role="radiogroup" aria-labelledby="${name}-label">${choices(q)
      .map(
        (c) => `<label class="option"><input type="radio" name="${name}" value="${esc(c.value)}" ${value === c.value ? "checked" : ""}><span class="option-key">${esc(c.key)}</span><span class="prose">${md(c.body)}</span></label>`,
      )
      .join("")}</div>`;
  }
  if (q.type === "fill") {
    return `<label class="field"><span class="sr-only">${esc(t.yourAnswer)}</span><input class="input" name="${name}" value="${esc(value)}" autocomplete="off" placeholder="${esc(t.placeholderFill)}"></label>`;
  }
  const code = q.type === "code";
  return `<label class="field"><span class="sr-only">${esc(t.yourAnswer)}</span><textarea class="textarea ${code ? "code" : ""}" name="${name}" spellcheck="${!code}" placeholder="${esc(code ? t.placeholderCode : t.placeholderShort)}">${esc(value)}</textarea></label>`;
}

function displayAnswer(q, value) {
  if (q.type === "tf") return value === "true" ? t.trueLabel : value === "false" ? t.falseLabel : value;
  if (q.type === "choice") {
    const o = q.options.find((x) => x.label === value);
    return o ? `**${o.label}.** ${o.body}` : value;
  }
  return q.type === "code" ? "```\n" + value + "\n```" : value;
}

function answeredView(q) {
  if (q.type === "choice" || q.type === "tf") {
    const opts = choices(q)
      .map((c) => {
        const mine = c.value === q.answer;
        const right = q.status === "graded" && c.value === q.expected;
        const cls = right ? "is-correct" : mine && q.status === "graded" ? "is-wrong" : mine ? "is-mine" : "";
        const mark = right ? icon("check") : mine && q.status === "graded" ? icon("x") : "";
        return `<div class="option ${cls}" aria-disabled="true"><span class="option-key">${esc(c.key)}</span><span style="display:flex;gap:var(--space-2);align-items:flex-start;justify-content:space-between"><span class="prose">${md(c.body)}</span>${mark}</span></div>`;
      })
      .join("");
    return `<div class="options">${opts}</div>`;
  }
  return `<div class="compare">
    <div><span class="label">${esc(t.yourAnswer)}</span><div class="prose">${md(displayAnswer(q, q.answer))}</div></div>
    ${q.status === "graded" ? `<div><span class="label">${esc(t.correctAnswer)}</span><div class="prose">${md(displayAnswer(q, q.expected))}</div></div>` : ""}
  </div>`;
}

function resultBanner(q) {
  if (q.status === "awaiting_review") {
    return `<div class="result pending">${icon("clock")}<div class="body"><strong>${esc(t.awaitingTutor)}</strong><span>${esc(t.awaitingBody)}</span></div></div>`;
  }
  const partial = q.score > 0 && q.score < 1;
  const cls = q.correct ? "correct" : partial ? "pending" : "wrong";
  const label = q.correct ? t.correct : partial ? `${Math.round(q.score * 100)}%` : t.incorrect;
  return `<div class="result ${cls}">${icon(q.correct ? "check" : partial ? "dot" : "x")}<div class="body"><strong>${esc(label)}</strong>
    ${q.feedback ? `<div><strong>${esc(t.feedback)}:</strong> <span class="prose">${md(q.feedback)}</span></div>` : ""}
    ${q.explanation ? `<div class="prose">${md(q.explanation)}</div>` : ""}</div></div>`;
}

function questionCard(q, draft, i) {
  const done = q.status !== "unanswered";
  const meta = q.kp ? "" : `<span class="chip">${esc(t.freePractice)}</span>`;
  return `<section class="card question reveal" style="--i:${i}" id="question-${q.n}" aria-labelledby="q${q.n}-label">
    <div class="question-head"><span class="q-num" aria-hidden="true">${q.n}</span>${difficultyChip(q.difficulty)}${meta}</div>
    <div class="prose" id="q${q.n}-label">${md(q.question)}</div>
    ${done ? answeredView(q) + resultBanner(q) : inputFor(q, draft)}
  </section>`;
}

function scoreCard() {
  const s = quiz.summary;
  if (!s.answered) return "";
  const pct = s.graded ? s.score / s.graded : 0;
  return `<section class="card score-card reveal" aria-label="${esc(t.score)}">
    <div class="score-big">${s.score}<span class="muted" style="font-size:1.25rem">/${s.graded}</span></div>
    <div style="display:grid;gap:var(--space-2)">
      <strong>${esc(t.score)}</strong>
      ${meter(pct, null, { large: true, label: `${Math.round(pct * 100)}%` })}
      <span class="muted">${esc(t.graded(s.graded, s.total))}${s.awaiting_review ? ` · ${esc(t.awaiting(s.awaiting_review))}` : ""}</span>
    </div>
  </section>`;
}

function updateProgress() {
  const draft = readDraft();
  const open = quiz.questions.filter((q) => q.status === "unanswered");
  const filled = open.filter((q) => String(draft[q.n] ?? "").trim()).length;
  const answered = quiz.summary.answered + filled;
  progress.textContent = t.answeredOf(answered, quiz.summary.total);
  submitBtn.disabled = submitting || filled === 0;
  bar.hidden = open.length === 0;
}

function render() {
  const draft = readDraft();
  const open = quiz.questions.filter((q) => q.status === "unanswered");
  document.title = `${quiz.title} · Master Everything`;
  main.setAttribute("aria-busy", "false");
  main.innerHTML = `
    <div class="page-head">
      <span class="chip primary" style="justify-self:start">${icon("list")}${esc(t.quiz)} · ${esc(t.questions(quiz.questions.length))}</span>
      <h1>${esc(quiz.title)}</h1>
      ${quiz.intro ? `<div class="prose muted">${md(quiz.intro)}</div>` : ""}
    </div>
    ${scoreCard()}
    <form id="quiz-form" novalidate style="display:grid;gap:var(--space-5)">
      ${quiz.questions.map((q, i) => questionCard(q, draft, i)).join("")}
      ${open.length && quiz.summary.answered + open.length > 1 ? `<p class="muted" style="text-align:center">${esc(t.partialNote)}</p>` : ""}
    </form>
    <div id="form-error" aria-live="assertive"></div>`;
  submitBtn.textContent = submitting ? t.submitting : t.submitQuiz;
  updateProgress();
}

function collect(form) {
  const draft = {};
  for (const q of quiz.questions) {
    if (q.status !== "unanswered") continue;
    const v = new FormData(form).get(`q${q.n}`);
    if (v != null && String(v).trim()) draft[q.n] = String(v);
  }
  return draft;
}

main.addEventListener("input", (e) => {
  const form = e.target.closest("#quiz-form");
  if (!form) return;
  writeDraft(collect(form));
  updateProgress();
});

// Tab inserts two spaces in code answers instead of leaving the field;
// Escape releases focus so keyboard users are never trapped.
main.addEventListener("keydown", (e) => {
  const el = e.target;
  if (!el.classList?.contains("code")) return;
  if (e.key === "Tab" && !e.shiftKey && !el.dataset.release) {
    e.preventDefault();
    const { selectionStart: s, selectionEnd: end, value } = el;
    el.value = value.slice(0, s) + "  " + value.slice(end);
    el.selectionStart = el.selectionEnd = s + 2;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } else if (e.key === "Escape") {
    el.dataset.release = "1";
  }
});
main.addEventListener("focusout", (e) => e.target.dataset && delete e.target.dataset.release);

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "quiz-form") return;
  e.preventDefault();
  const answers = collect(e.target);
  if (!Object.keys(answers).length) return;
  submitting = true;
  submitBtn.disabled = true;
  submitBtn.textContent = t.submitting;
  try {
    const r = await api(`/api/quiz/${encodeURIComponent(id)}/submit`, { answers });
    quiz = r.quiz;
    writeDraft({});
    submitting = false;
    render();
    const first = quiz.questions.find((q) => answers[q.n]);
    document.getElementById(`question-${first?.n}`)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  } catch (err) {
    submitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = t.submitQuiz;
    document.getElementById("form-error").innerHTML = `<div class="notice error">${icon("alert")}<span>${esc(err.message)}</span></div>`;
  }
});

async function load() {
  if (submitting || document.activeElement?.closest?.("#quiz-form")) return;
  try {
    const r = await api(`/api/quiz/${encodeURIComponent(id)}`);
    setLanguage(r.language);
    document.querySelector(".skip-link").textContent = t.skip;
    document.getElementById("back-link").innerHTML = `${icon("arrowLeft")}<span>${esc(t.backToDashboard)}</span>`;
    quiz = r.quiz;
    render();
  } catch (err) {
    main.setAttribute("aria-busy", "false");
    main.innerHTML = `<div class="notice error">${icon("alert")}<span>${esc(err.message)}</span></div>`;
  }
}

load();
liveUpdates(load);
