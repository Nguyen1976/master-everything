// Dashboard: progress, what to do next, the open question, the roadmap,
// reviews, quizzes and mistakes. Everything shown comes from `engine snapshot`.

import { api, esc, formatDate, icon, liveUpdates, md, meter, setLanguage, t } from "./common.js";

const main = document.getElementById("main");
const tabs = document.getElementById("tabs");
document.getElementById("brand-mark").innerHTML = icon("logo");

let data = null;
let selected = null; // roadmap id shown; defaults to the engine's current roadmap
const openModules = new Set();

const STATUS_ICON = { mastered: "check", learning: "dot", new: "circle", deferred: "pause" };

function kpiCard(iconName, value, label, accent = false, i = 0) {
  return `<section class="card kpi reveal" style="--i:${i}">
    <span class="kpi-icon ${accent ? "accent" : ""}">${icon(iconName)}</span>
    <div><div class="kpi-value">${value}</div><div class="kpi-label">${esc(label)}</div></div>
  </section>`;
}

function renderKpis(path) {
  const s = path.summary;
  const acc = data.stats.recent_accuracy;
  return `<div class="grid-kpi">
    ${kpiCard("target", `${s.mastered}<span class="muted" style="font-size:1rem"> / ${s.total}</span>`, `${t.mastered} · ${t.objectives}`, false, 0)}
    ${kpiCard("rotate", String(data.due_reviews.length), t.dueReviews, data.due_reviews.length > 0, 1)}
    ${kpiCard("chart", acc == null ? "—" : `${Math.round(acc * 100)}%`, t.accuracy, false, 2)}
    ${kpiCard("flame", esc(t.days(data.stats.days.streak)), t.streak, false, 3)}
  </div>`;
}

function renderNext(path) {
  const n = path.next;
  if (!n) {
    return `<section class="card reveal"><div class="card-title">${icon("check")}<h2>${esc(t.upNext)}</h2></div><p>${esc(t.allDone)}</p></section>`;
  }
  const qualitative = typeof n.gate !== "number";
  return `<section class="card reveal" aria-labelledby="next-title">
    <div class="card-head">
      <div class="card-title">${icon("arrowRight")}<h2 id="next-title">${esc(t.upNext)}</h2></div>
      <span class="chip primary">${esc(t.action[n.action] || n.action)}</span>
    </div>
    <div style="display:grid;gap:var(--space-2)">
      <span class="muted">${esc(n.module)}</span>
      <h3 style="font-size:1.25rem">${esc(n.name)}</h3>
      <p class="muted">${esc(n.module_objective)}</p>
    </div>
    <div style="display:grid;gap:var(--space-2)">
      <div style="display:flex;justify-content:space-between;font-size:.875rem" class="muted">
        <span>${qualitative ? esc(t.explainGate) : `${Math.round(n.mastery * 100)}% · ${esc(t.gate)} ${Math.round(n.gate * 100)}%`}</span>
        <span class="chip">${esc(t.type[n.type] || n.type)}</span>
      </div>
      ${meter(n.mastery, qualitative ? null : n.gate, { large: true, label: `${Math.round(n.mastery * 100)}%` })}
    </div>
    ${n.sources.length ? `<div style="display:grid;gap:var(--space-2)"><span class="muted" style="font-size:.875rem;font-weight:600">${esc(t.sources)}</span><ul class="list">${n.sources
      .map((s) => `<li class="list-item">${icon("file")}<span class="grow truncate" title="${esc(s)}">${esc(s)}</span></li>`)
      .join("")}</ul></div>` : ""}
    <div class="notice">${icon("terminal")}<span>${esc(t.continueInChat)} <kbd>${path.current ? "/learn" : `/roadmap → ${esc(path.id)}`}</kbd></span></div>
  </section>`;
}

function optionsMarkup(q, name) {
  const opts = q.type === "tf" ? [{ label: "true", key: "T", body: t.trueLabel }, { label: "false", key: "F", body: t.falseLabel }] : q.options.map((o) => ({ label: o.label, key: o.label, body: o.body }));
  return `<div class="options" role="radiogroup" aria-label="${esc(t.yourAnswer)}">${opts
    .map(
      (o) => `<label class="option"><input type="radio" name="${name}" value="${esc(o.label)}" required><span class="option-key">${esc(o.key)}</span><span class="prose">${md(o.body)}</span></label>`,
    )
    .join("")}</div>`;
}

function answerInput(q, name) {
  if (q.type === "choice" || q.type === "tf") return optionsMarkup(q, name);
  if (q.type === "fill") return `<label class="field"><span class="sr-only">${esc(t.yourAnswer)}</span><input class="input" name="${name}" autocomplete="off" placeholder="${esc(t.placeholderFill)}" required></label>`;
  return `<label class="field"><span class="sr-only">${esc(t.yourAnswer)}</span><textarea class="textarea ${q.type === "code" ? "code" : ""}" name="${name}" spellcheck="${q.type !== "code"}" placeholder="${esc(q.type === "code" ? t.placeholderCode : t.placeholderShort)}" required></textarea></label>`;
}

function renderPending() {
  const q = data.pending;
  if (!q) return "";
  const answered = q.status === "answered";
  return `<section class="card reveal" aria-labelledby="pending-title" id="pending">
    <div class="card-head">
      <div class="card-title">${icon("message")}<h2 id="pending-title">${esc(t.openQuestion)}</h2></div>
      <span class="chip">${esc(t.difficulty[q.difficulty] || q.difficulty)}</span>
    </div>
    <span class="muted">${esc(q.kp_name || "")}</span>
    <div class="prose">${md(q.question)}</div>
    ${
      answered
        ? `<div class="result pending">${icon("clock")}<div class="body"><strong>${esc(t.awaitingTutor)}</strong><span>${esc(t.sentToTutor)}</span></div></div>`
        : `<form id="pending-form" data-id="${esc(q.id)}" style="display:grid;gap:var(--space-4)">
            ${answerInput(q, "answer")}
            <div style="display:flex;gap:var(--space-3);align-items:center;flex-wrap:wrap">
              <button class="btn btn-accent" type="submit">${esc(t.submit)}</button>
              <span class="muted" style="font-size:.875rem">${esc(t.answerHere)}</span>
            </div>
            <div id="pending-result" aria-live="polite"></div>
          </form>`
    }
  </section>`;
}

function renderRoadmap(path) {
  return `<section class="stack" aria-labelledby="roadmap-title">
    <div class="card-head"><div class="card-title">${icon("list")}<h2 id="roadmap-title">${esc(t.roadmap)}</h2></div></div>
    ${path.modules
      .map((m, i) => {
        const done = m.kps.filter((k) => k.status === "mastered").length;
        const hasCurrent = m.kps.some((k) => k.current);
        const open = openModules.has(m.id) || (openModules.size === 0 && hasCurrent);
        return `<details class="module reveal" style="--i:${i}" data-module="${esc(m.id)}" ${open ? "open" : ""}>
          <summary>
            <div style="display:grid;gap:2px;min-width:0"><h3>${esc(m.name)}</h3><span class="muted" style="font-size:.9375rem">${esc(m.objective)}</span></div>
            <span class="module-meta">${done}/${m.kps.length}</span>
            <div class="module-bar">${meter(done / m.kps.length, null, { label: `${done}/${m.kps.length}` })}</div>
          </summary>
          <ul class="kp-list">${m.kps.map(kpRow).join("")}</ul>
        </details>`;
      })
      .join("")}
  </section>`;
}

function kpRow(k) {
  const qualitative = typeof k.gate !== "number";
  const chips = [`<span class="chip">${esc(t.type[k.type] || k.type)}</span>`];
  if (k.current) chips.push(`<span class="chip primary">${icon("arrowRight")}${esc(t.current)}</span>`);
  if (k.review?.due) chips.push(`<span class="chip warning">${icon("rotate")}${esc(t.reviewDue)}</span>`);
  else if (k.review) chips.push(`<span class="chip">${icon("clock")}${esc(t.reviewOn(formatDate(k.review.due_at)))}</span>`);
  const value = k.status === "mastered" ? 1 : k.mastery;
  return `<li class="kp ${k.current ? "current" : ""}">
    <span class="status-icon ${k.status}" title="${esc(t.status[k.status])}">${icon(STATUS_ICON[k.status])}<span class="sr-only">${esc(t.status[k.status])}</span></span>
    <div style="min-width:0"><div class="kp-name">${esc(k.name)}</div><div class="kp-sub">${chips.join("")}</div></div>
    <div class="meter-wrap">${meter(value, qualitative ? null : k.gate, { label: `${t.status[k.status]} ${Math.round(value * 100)}%` })}</div>
  </li>`;
}

function renderReviews() {
  const due = data.due_reviews;
  const upcoming = data.upcoming_reviews;
  const body =
    !due.length && !upcoming.length
      ? `<p class="muted">${esc(t.noReviews)}</p>`
      : `${due.length ? `<div style="display:grid;gap:var(--space-2)"><span class="chip warning" style="justify-self:start">${esc(t.dueNow)} · ${due.length}</span><ul class="list">${due
          .map((d) => `<li class="list-item">${icon("rotate")}<span class="grow truncate">${esc(d.name)}</span></li>`)
          .join("")}</ul><p class="muted" style="font-size:.875rem">${esc(t.startReview)}</p></div>` : ""}
        ${upcoming.length ? `<div style="display:grid;gap:var(--space-2)"><span class="muted" style="font-size:.875rem;font-weight:600">${esc(t.upcoming)}</span><ul class="list">${upcoming
          .map((u) => `<li class="list-item">${icon("clock")}<span class="grow truncate">${esc(u.name)}</span><span class="muted" style="font-size:.875rem">${esc(formatDate(u.due_at))}</span></li>`)
          .join("")}</ul></div>` : ""}`;
  return `<section class="card reveal" aria-labelledby="reviews-title"><div class="card-title">${icon("rotate")}<h2 id="reviews-title">${esc(t.reviews)}</h2></div>${body}</section>`;
}

function renderQuizzes() {
  const quizzes = data.quizzes || [];
  const body = quizzes.length
    ? `<ul class="list">${quizzes
        .map(
          (q) => `<li><a class="list-item" href="/quiz/${encodeURIComponent(q.id)}">${icon("list")}<span class="grow" style="display:grid;min-width:0"><span class="truncate" style="font-weight:600">${esc(q.title)}</span><span class="muted" style="font-size:.875rem">${esc(t.answeredOf(q.answered, q.total))}${
            q.awaiting_review ? ` · ${esc(t.awaiting(q.awaiting_review))}` : ""
          }</span></span>${q.graded ? `<span class="chip ${q.score / q.graded >= 0.8 ? "success" : "primary"}">${q.score}/${q.graded}</span>` : ""}</a></li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">${esc(t.noQuizzes)}</p>`;
  return `<section class="card reveal" aria-labelledby="quizzes-title"><div class="card-title">${icon("book")}<h2 id="quizzes-title">${esc(t.quizzes)}</h2></div>${body}</section>`;
}

function renderMistakes() {
  const items = data.mistakes;
  const body = items.length
    ? items
        .map(
          (m) => `<article class="mistake">
          <div class="prose">${md(m.question)}</div>
          <details><summary>${esc(t.showDetails)}</summary>
            <div style="display:grid;gap:var(--space-3);margin-top:var(--space-2)">
              <div class="compare">
                <div><span class="label">${esc(t.youAnswered)}</span><span class="prose">${md(m.learner_answer || "—")}</span></div>
                <div><span class="label">${esc(t.correctAnswer)}</span><span class="prose">${md(answerText(m))}</span></div>
              </div>
              ${m.explanation ? `<div class="prose">${md(m.explanation)}</div>` : ""}
            </div>
          </details>
        </article>`,
        )
        .join("")
    : `<p class="muted">${esc(t.noMistakes)}</p>`;
  return `<section class="card" aria-labelledby="mistakes-title"><div class="card-title">${icon("alert")}<h2 id="mistakes-title">${esc(t.mistakes)}</h2></div>${body}</section>`;
}

function answerText(item) {
  if (item.type === "choice" && item.options) {
    const o = item.options.find((x) => x.label === item.expected);
    return o ? `${o.label}. ${o.body}` : item.expected;
  }
  if (item.type === "tf") return item.expected === "true" ? t.trueLabel : t.falseLabel;
  return item.expected || "—";
}

function renderEmpty() {
  return `<section class="card empty reveal">
    <span class="kpi-icon">${icon("book")}</span>
    <h1>${esc(t.emptyTitle)}</h1>
    <p class="muted">${esc(t.emptyBody)}</p>
    <ol class="steps">${t.emptySteps.map((s) => `<li><span>${s}</span></li>`).join("")}</ol>
  </section>`;
}

function renderTabs() {
  if (data.paths.length < 2) {
    tabs.hidden = true;
    return;
  }
  tabs.hidden = false;
  tabs.innerHTML = data.paths
    .map((p) => `<button class="tab" role="tab" aria-selected="${p.id === selected}" data-path="${esc(p.id)}">${esc(p.name)}</button>`)
    .join("");
}

function render() {
  setLanguage(data.language);
  document.querySelector(".skip-link").textContent = t.skip;
  if (!selected || !data.paths.some((p) => p.id === selected)) selected = data.current_path || data.paths[0]?.id || null;
  renderTabs();
  const path = data.paths.find((p) => p.id === selected);
  main.setAttribute("aria-busy", "false");
  if (!path) {
    main.innerHTML = renderEmpty();
    return;
  }
  document.title = `${path.name} · Master Everything`;
  main.innerHTML = `
    <div class="page-head"><h1>${esc(path.name)}</h1><p class="muted">${esc(t.goal)}: ${esc(path.goal)}</p></div>
    ${renderKpis(path)}
    <div class="grid-main">
      <div class="stack">${path.current ? renderPending() : ""}${renderNext(path)}${renderRoadmap(path)}</div>
      <div class="stack">${renderReviews()}${renderQuizzes()}${renderMistakes()}</div>
    </div>`;
  bindPendingForm();
}

function bindPendingForm() {
  const form = document.getElementById("pending-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const value = new FormData(form).get("answer");
    if (!value || !String(value).trim()) return;
    const button = form.querySelector("button[type=submit]");
    const out = document.getElementById("pending-result");
    button.disabled = true;
    button.textContent = t.submitting;
    try {
      const r = await api("/api/question/answer", { id: form.dataset.id, answer: String(value) });
      if (r.status === "answered") {
        out.innerHTML = `<div class="result pending">${icon("clock")}<div class="body">${esc(t.sentToTutor)}</div></div>`;
      } else {
        const ok = r.correct;
        out.innerHTML = `<div class="result ${ok ? "correct" : "wrong"}">${icon(ok ? "check" : "x")}<div class="body"><strong>${esc(ok ? t.correct : t.incorrect)}</strong>${
          ok ? "" : `<div class="prose"><span>${esc(t.correctAnswer)}:</span>${md(answerText({ type: data.pending.type, options: data.pending.options, expected: r.expected }))}</div>`
        }<div class="prose">${md(r.explanation || "")}</div></div></div>`;
      }
      form.querySelectorAll("input,textarea,button").forEach((el) => (el.disabled = true));
    } catch (err) {
      out.innerHTML = `<div class="notice error">${icon("alert")}<span>${esc(err.message)}</span></div>`;
      button.disabled = false;
      button.textContent = t.submit;
    }
  });
}

tabs.addEventListener("click", (e) => {
  const b = e.target.closest("[data-path]");
  if (!b) return;
  selected = b.dataset.path;
  openModules.clear();
  render();
});
main.addEventListener("toggle", (e) => {
  const d = e.target.closest?.("details[data-module]");
  if (d) d.open ? openModules.add(d.dataset.module) : openModules.delete(d.dataset.module);
}, true);

async function load() {
  // Don't re-render under the learner while they are typing an answer.
  if (document.activeElement?.closest?.("#pending-form")) return;
  try {
    data = await api("/api/snapshot");
    render();
  } catch (err) {
    main.innerHTML = `<div class="notice error">${icon("alert")}<span>${esc(t.loadError)} (${esc(err.message)})</span></div>`;
  }
}

load();
liveUpdates(load);
