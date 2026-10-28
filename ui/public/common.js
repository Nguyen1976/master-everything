// Shared helpers for the dashboard and quiz pages: i18n, icons, safe Markdown,
// API calls and live updates. No build step, no dependencies.

const STRINGS = {
  en: {
    live: "Live",
    offline: "Reconnecting…",
    dashboard: "Dashboard",
    backToDashboard: "Dashboard",
    skip: "Skip to content",
    goal: "Goal",
    mastered: "Mastered",
    dueReviews: "Reviews due",
    accuracy: "Recent accuracy",
    streak: "Study streak",
    days: (n) => `${n} day${n === 1 ? "" : "s"}`,
    objectives: "objectives",
    upNext: "Up next",
    allDone: "Every objective on this roadmap is mastered.",
    action: { probe: "Quick check first", teach: "New lesson", practice: "Practice to the gate", assess: "Explain it in your own words" },
    gate: "gate",
    explainGate: "Passes with a clear explanation",
    sources: "Sources",
    continueInChat: "Continue in Claude Code with",
    openQuestion: "Open question",
    answerHere: "Answer here or in the chat.",
    yourAnswer: "Your answer",
    submit: "Submit answer",
    submitting: "Submitting…",
    sentToTutor: "Sent. Your tutor will grade it in the chat.",
    correct: "Correct",
    incorrect: "Not quite",
    correctAnswer: "Correct answer",
    explanation: "Explanation",
    roadmap: "Roadmap",
    legend: "Legend",
    routeSummary: (m, total) => `${m} of ${total} objectives mastered`,
    youAreHere: "You are here",
    explainShort: "Explain to pass",
    status: { mastered: "Mastered", learning: "Learning", new: "Not started", deferred: "Parked" },
    type: { memory: "memory", procedure: "procedure", concept: "concept", design: "design" },
    reviewDue: "Review due",
    reviewOn: (d) => `Review ${d}`,
    current: "Current",
    reviews: "Reviews",
    noReviews: "Nothing to review yet. Mastered objectives come back here on a schedule.",
    dueNow: "Due now",
    upcoming: "Coming up",
    startReview: "Type /recall in Claude Code to review.",
    quizzes: "Quizzes",
    noQuizzes: "No quizzes yet. Ask your tutor for one with /quiz.",
    awaiting: (n) => `${n} awaiting review`,
    mistakes: "Mistakes to revisit",
    noMistakes: "No mistakes recorded. Wrong answers show up here with their explanations.",
    showDetails: "Show answer and explanation",
    youAnswered: "You answered",
    emptyTitle: "Your study room is ready",
    emptyBody: "Start in Claude Code, in this folder:",
    emptySteps: ["Type <kbd>/ingest</kbd> to catalogue your materials", "Type <kbd>/roadmap</kbd> to get interviewed and receive a plan", "Come back here to follow your progress"],
    loadError: "Could not load data. Is the server still running?",
    trueLabel: "True",
    falseLabel: "False",
    quiz: "Quiz",
    questions: (n) => `${n} question${n === 1 ? "" : "s"}`,
    answeredOf: (a, t) => `${a} of ${t} answered`,
    submitQuiz: "Submit answers",
    partialNote: "Unanswered questions stay open, so you can come back to them.",
    score: "Score",
    graded: (g, t) => `${g} of ${t} graded`,
    awaitingTutor: "Waiting for your tutor",
    awaitingBody: "Go back to Claude Code and say you finished the quiz. Your tutor will grade the written answers.",
    feedback: "Tutor feedback",
    placeholderFill: "Type the missing word or phrase",
    placeholderShort: "Explain in a few sentences",
    placeholderCode: "Write your code here",
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
    freePractice: "Free practice",
    noAnswer: "No answer yet",
  },
  vi: {
    live: "Trực tiếp",
    offline: "Đang kết nối lại…",
    dashboard: "Bảng điều khiển",
    backToDashboard: "Bảng điều khiển",
    skip: "Bỏ qua đến nội dung",
    goal: "Mục tiêu",
    mastered: "Đã thuộc",
    dueReviews: "Bài cần ôn",
    accuracy: "Độ chính xác gần đây",
    streak: "Chuỗi ngày học",
    days: (n) => `${n} ngày`,
    objectives: "mục tiêu",
    upNext: "Tiếp theo",
    allDone: "Bạn đã thuộc mọi mục tiêu trong lộ trình này.",
    action: { probe: "Kiểm tra nhanh trước", teach: "Bài học mới", practice: "Luyện đến khi qua cổng", assess: "Giải thích bằng lời của bạn" },
    gate: "cổng",
    explainGate: "Qua khi giải thích rõ ràng",
    sources: "Tài liệu",
    continueInChat: "Tiếp tục trong Claude Code với",
    openQuestion: "Câu hỏi đang mở",
    answerHere: "Trả lời tại đây hoặc trong chat.",
    yourAnswer: "Câu trả lời của bạn",
    submit: "Gửi câu trả lời",
    submitting: "Đang gửi…",
    sentToTutor: "Đã gửi. Gia sư sẽ chấm trong chat.",
    correct: "Chính xác",
    incorrect: "Chưa đúng",
    correctAnswer: "Đáp án đúng",
    explanation: "Giải thích",
    roadmap: "Lộ trình",
    legend: "Chú giải",
    routeSummary: (m, total) => `Đã thuộc ${m}/${total} mục tiêu`,
    youAreHere: "Bạn ở đây",
    explainShort: "Giải thích để qua",
    status: { mastered: "Đã thuộc", learning: "Đang học", new: "Chưa bắt đầu", deferred: "Tạm gác" },
    type: { memory: "ghi nhớ", procedure: "kỹ năng", concept: "khái niệm", design: "thiết kế" },
    reviewDue: "Đến hạn ôn",
    reviewOn: (d) => `Ôn ngày ${d}`,
    current: "Đang học",
    reviews: "Ôn tập",
    noReviews: "Chưa có gì để ôn. Mục tiêu đã thuộc sẽ quay lại đây theo lịch.",
    dueNow: "Đến hạn",
    upcoming: "Sắp tới",
    startReview: "Gõ /recall trong Claude Code để ôn.",
    quizzes: "Bộ câu hỏi",
    noQuizzes: "Chưa có bộ câu hỏi nào. Nhờ gia sư tạo bằng /quiz.",
    awaiting: (n) => `${n} câu chờ chấm`,
    mistakes: "Lỗi sai cần xem lại",
    noMistakes: "Chưa có lỗi sai nào. Câu trả lời sai sẽ hiện ở đây kèm giải thích.",
    showDetails: "Xem đáp án và giải thích",
    youAnswered: "Bạn trả lời",
    emptyTitle: "Phòng học đã sẵn sàng",
    emptyBody: "Bắt đầu trong Claude Code, tại thư mục này:",
    emptySteps: ["Gõ <kbd>/ingest</kbd> để lập danh mục tài liệu", "Gõ <kbd>/roadmap</kbd> để được phỏng vấn và nhận lộ trình", "Quay lại đây để theo dõi tiến độ"],
    loadError: "Không tải được dữ liệu. Server còn chạy không?",
    trueLabel: "Đúng",
    falseLabel: "Sai",
    quiz: "Bộ câu hỏi",
    questions: (n) => `${n} câu`,
    answeredOf: (a, t) => `Đã trả lời ${a}/${t}`,
    submitQuiz: "Nộp bài",
    partialNote: "Câu chưa trả lời vẫn để mở, bạn có thể quay lại làm sau.",
    score: "Điểm",
    graded: (g, t) => `Đã chấm ${g}/${t}`,
    awaitingTutor: "Đang chờ gia sư chấm",
    awaitingBody: "Quay lại Claude Code và báo là bạn đã làm xong. Gia sư sẽ chấm các câu tự luận.",
    feedback: "Nhận xét của gia sư",
    placeholderFill: "Nhập từ hoặc cụm từ còn thiếu",
    placeholderShort: "Giải thích trong vài câu",
    placeholderCode: "Viết code tại đây",
    difficulty: { easy: "Dễ", medium: "Vừa", hard: "Khó" },
    freePractice: "Luyện tự do",
    noAnswer: "Chưa trả lời",
  },
};

export let t = STRINGS.en;
export let lang = "en";
export function setLanguage(code) {
  lang = STRINGS[String(code || "en").slice(0, 2)] ? String(code).slice(0, 2) : "en";
  t = STRINGS[lang];
  document.documentElement.lang = lang;
}

// Lucide-style outline icons (MIT), inlined so the UI works offline.
const ICONS = {
  logo: '<path d="M4 19V7l8-4 8 4v12"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  check: '<circle cx="12" cy="12" r="9.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  checkPlain: '<path d="M20 6 9 17l-5-5"/>',
  x: '<circle cx="12" cy="12" r="9.5"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  dot: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="3.5"/>',
  circle: '<circle cx="12" cy="12" r="9.5"/>',
  pause: '<circle cx="12" cy="12" r="9.5"/><path d="M10 15V9"/><path d="M14 15V9"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  list: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  alert: '<circle cx="12" cy="12" r="9.5"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
};
export function icon(name, cls = "") {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
}

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Minimal Markdown for tutor-written text: fenced code, inline code, bold,
// italics, bullet/numbered lists and paragraphs. Input is escaped first, so
// no raw HTML from questions or answers ever reaches the page.
export function md(src) {
  const blocks = [];
  let text = esc(src).replace(/```[\w+-]*\n?([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`);
    return `\n\n\u0000${blocks.length - 1}\u0000\n\n`;
  });
  const inline = (s) =>
    s
      .replace(/``\s?(.+?)\s?``/g, (_, c) => `<code>${c.replace(/`/g, "&#96;")}</code>`)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return text
    .split(/\n{2,}/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      if (/^\u0000\d+\u0000$/.test(trimmed)) return trimmed;
      const lines = trimmed.split("\n");
      if (lines.every((l) => /^\s*[-*] /.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("")}</ul>`;
      if (lines.every((l) => /^\s*\d+[.)] /.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)] /, ""))}</li>`).join("")}</ol>`;
      return `<p>${inline(trimmed).replace(/\n/g, "<br>")}</p>`;
    })
    .join("")
    .replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

export async function api(path, body) {
  const init = body === undefined ? {} : { method: "POST", headers: { "content-type": "application/json", "x-master-everything": "1" }, body: JSON.stringify(body) };
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({ ok: false, error: res.statusText }));
  if (!res.ok || data.ok === false) throw new Error(data.error || res.statusText);
  return data;
}

// Calls onChange whenever the learning data changes on disk (the tutor wrote
// to the engine), plus when the tab regains focus.
export function liveUpdates(onChange) {
  const badge = document.querySelector("[data-live]");
  const setLive = (on) => {
    if (!badge) return;
    badge.dataset.on = String(on);
    badge.querySelector("span:last-child").textContent = on ? t.live : t.offline;
  };
  let source;
  const connect = () => {
    source = new EventSource("/api/events");
    source.onopen = () => setLive(true);
    source.addEventListener("change", onChange);
    source.onerror = () => setLive(false);
  };
  connect();
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && onChange());
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US", { month: "short", day: "numeric" });
}

export function meter(value, gate, { large = false, label = "" } = {}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  const done = typeof gate === "number" ? value >= gate : value >= 1;
  const gateMark = typeof gate === "number" ? `<span class="meter-gate" style="left:calc(${gate * 100}% - 1px)"></span>` : "";
  return `<div class="meter ${large ? "meter-lg" : ""}" role="img" aria-label="${esc(label || `${pct}%`)}"><span class="meter-fill ${done ? "done" : ""}" style="width:${pct}%"></span>${gateMark}</div>`;
}
