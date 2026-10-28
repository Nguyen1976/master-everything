// Dashboard: progress, what to do next, the open question, the roadmap,
// reviews, quizzes and mistakes. Everything shown comes from `engine snapshot`.

import { api, esc, formatDate, icon, liveUpdates, md, meter, setLanguage, t } from "./common.js";

const main = document.getElementById("main");
const tabs = document.getElementById("tabs");
document.getElementById("brand-mark").innerHTML = icon("logo");

let data = null;
let selected = null; // roadmap id shown; defaults to the engine's current roadmap
const openModules = new Set();


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
    return `<section class="card reveal next-card"><div class="card-title">${icon("check")}<h2>${esc(t.upNext)}</h2></div><p>${esc(t.allDone)}</p></section>`;
  }
  const qualitative = typeof n.gate !== "number";
  return `<section class="card reveal next-card" aria-labelledby="next-title">
    <div class="card-head">
      <div class="card-title">${icon("arrowRight")}<h2 id="next-title">${esc(t.upNext)}</h2></div>
      <span class="chip primary">${esc(t.action[n.action] || n.action)}</span>
    </div>
    <div style="display:grid;gap:2px">
      <span class="muted" style="font-size:.875rem">${esc(n.module)}</span>
      <h3 style="font-size:1.25rem">${esc(n.name)}</h3>
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

// The roadmap as a transit line: each module is a station, each objective a
// stop. Travelled track is solid, the rest dashed; the current stop is marked
// with aria-current and a "you are here" label, never by colour alone.
function stageState(m) {
  if (m.kps.every((k) => k.status === "mastered")) return "done";
  if (m.kps.some((k) => k.current)) return "active";
  return m.kps.some((k) => k.status !== "new") ? "started" : "upcoming";
}

function renderRoadmap(path) {
  return `<section class="card roadmap" aria-labelledby="roadmap-title">
    <div class="card-head">
      <div class="card-title">${icon("list")}<h2 id="roadmap-title">${esc(t.roadmap)}</h2></div>
      <ul class="route-key" aria-label="${esc(t.legend)}">
        <li><span class="key-dot mastered"></span>${esc(t.status.mastered)}</li>
        <li><span class="key-dot current"></span>${esc(t.current)}</li>
        <li><span class="key-dot new"></span>${esc(t.status.new)}</li>
      </ul>
    </div>
    <p class="muted route-summary">${esc(t.routeSummary(path.summary.mastered, path.summary.total))}</p>
    <ol class="route">${path.modules.map(stageMarkup).join("")}</ol>
  </section>`;
}

function stageMarkup(m, i) {
  const state = stageState(m);
  const done = m.kps.filter((k) => k.status === "mastered").length;
  const open = openModules.has("__touched") ? openModules.has(m.id) : state === "active";
  const node = state === "done" ? icon("checkPlain") : String(i + 1);
  return `<li class="stage" data-state="${state}">
    <details data-module="${esc(m.id)}" ${open ? "open" : ""}>
      <summary class="stage-head">
        <span class="stage-node" aria-hidden="true">${node}</span>
        <span class="stage-text">
          <span class="stage-name">${esc(m.name)}</span>
          <span class="stage-objective">${esc(m.objective)}</span>
        </span>
        <span class="stage-count">${done}/${m.kps.length}<span class="sr-only"> ${esc(t.status.mastered)}</span></span>
      </summary>
      <ol class="stops">${m.kps.map(stopMarkup).join("")}</ol>
    </details>
  </li>`;
}

function stopMarkup(k) {
  const qualitative = typeof k.gate !== "number";
  const meta = [esc(t.type[k.type] || k.type)];
  if (k.review?.due) meta.push(`<span class="stop-flag">${icon("rotate")}${esc(t.reviewDue)}</span>`);
  else if (k.review) meta.push(esc(t.reviewOn(formatDate(k.review.due_at))));
  let value;
  if (k.status === "mastered") value = `<span class="stop-value done">${icon("checkPlain")}<span class="sr-only">${esc(t.status.mastered)}</span></span>`;
  else if (k.status === "deferred") value = `<span class="stop-value muted">${esc(t.status.deferred)}</span>`;
  else if (k.status === "learning" && !qualitative) value = `<span class="stop-value">${Math.round(k.mastery * 100)}%<span class="stop-gate"> / ${Math.round(k.gate * 100)}</span></span>`;
  else if (k.status === "learning") value = `<span class="stop-value muted">${esc(t.explainShort)}</span>`;
  else value = `<span class="stop-value muted" aria-hidden="true">—</span>`;
  const here = k.current ? ` <span class="here">${esc(t.youAreHere)}</span>` : "";
  return `<li class="stop" data-status="${k.current ? "current" : k.status}" ${k.current ? 'aria-current="step"' : ""}>
    <span class="stop-dot" aria-hidden="true"></span>
    <span class="stop-body">
      <span class="stop-name">${esc(k.name)}${here}</span>
      <span class="stop-meta"><span class="sr-only">${esc(t.status[k.status])}. </span>${meta.join('<span aria-hidden="true"> · </span>')}</span>
    </span>
    ${value}
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
      <div class="stack">${renderNext(path)}${renderRoadmap(path)}</div>
      <div class="stack side">${path.current ? renderPending() : ""}${renderReviews()}${renderQuizzes()}${renderMistakes()}</div>
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
// Remember stations the learner opens or closes, so live refreshes keep their layout.
main.addEventListener("click", (e) => {
  const summary = e.target.closest?.("details[data-module] > summary");
  if (!summary) return;
  setTimeout(() => {
    openModules.clear();
    openModules.add("__touched");
    document.querySelectorAll("details[data-module][open]").forEach((x) => openModules.add(x.dataset.module));
  });
});

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
