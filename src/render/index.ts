import { isBlank } from "../load";
import { aiPrompt } from "../template";
import type { OnboardingData } from "../types";
import { CSS, FONTS, JS, MERMAID_URL } from "./assets";
import { CHAPTER_HUES, type ChapterId, type Copy, copyFor } from "./copy";
import { escapeHtml, repoBase, text } from "./html";
import { CHAPTERS, type Slide } from "./slides";

export { escapeHtml } from "./html";

const ICON_GRID =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M3 3h5.5v5.5H3zM11.5 3H17v5.5h-5.5zM3 11.5h5.5V17H3zM11.5 11.5H17V17h-5.5z" opacity=".9"/></svg>';
const ICON_THEME =
  '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg>';

interface Chapter {
  id: ChapterId;
  num: number;
  name: string;
  start: number;
  count: number;
}

function shell(lang: string, title: string, body: string, opts: { mermaid?: boolean; solo?: boolean } = {}): string {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
${FONTS}
<style>${CSS}</style>
</head>
<body${opts.solo ? ' class="solo"' : ""}>
${body}
<script>${JS}</script>
${opts.mermaid ? `<script src="${MERMAID_URL}" onload="window.__okMermaid&&window.__okMermaid()"></script>` : ""}
</body>
</html>`;
}

function soloPage(lang: string, t: Copy, heading: string, body: string, code: string, isError = false): string {
  const block = isError
    ? `<pre>${escapeHtml(code)}</pre>`
    : `<div class="prompt"><pre>${escapeHtml(code)}</pre><button type="button" class="copy" data-copy="${escapeHtml(code)}" data-done="${escapeHtml(t.setup.copied)}">${t.setup.copy}</button></div>`;
  return shell(
    lang,
    "Onboarding",
    `<div class="solo-wrap"><div class="solo-card"><p class="kicker"><span class="num">👋</span>onboarding-kit</p><h1>${escapeHtml(heading)}</h1>${body ? `<p>${escapeHtml(body)}</p>` : ""}${block}</div></div>`,
    { solo: true },
  );
}

export function renderMissingPage(): string {
  const t = copyFor("pt-BR");
  return soloPage("pt-BR", t, t.missing.title, t.missing.body, "npx onboarding-kit init");
}

export function renderErrorPage(message: string): string {
  const t = copyFor("pt-BR");
  return soloPage("pt-BR", t, t.invalid.title, "", message, true);
}

function welcomeSlide(data: OnboardingData, t: Copy, chapters: Chapter[], minutes: number): Slide {
  const p = data.project;
  const name = p?.name?.trim() || "Onboarding";
  const generated = data.meta?.generatedAt ? new Date(data.meta.generatedAt) : undefined;
  const base = repoBase(data);
  const meta = [
    p?.status ? `<span class="badge">${escapeHtml(p.status)}</span>` : "",
    `<span>⏱ ${minutes} ${t.ui.minutes}</span>`,
    generated && !Number.isNaN(generated.getTime())
      ? `<span>${t.ui.generated} ${escapeHtml(generated.toLocaleDateString(data.meta.language || "pt-BR"))}${data.meta.generatedBy ? ` ${t.ui.by} ${escapeHtml(data.meta.generatedBy)}` : ""}</span>`
      : "",
    base ? `<a href="${escapeHtml(base)}" target="_blank" rel="noopener">${escapeHtml(base.replace(/^https?:\/\//, ""))}</a>` : "",
  ].filter(Boolean);

  const journey = chapters
    .filter((c) => c.id !== "welcome" && c.id !== "finale")
    .map((c) => `<li><button type="button" data-go="${c.start}" style="--ch:${CHAPTER_HUES[c.id]}"><span class="n">${c.num}</span>${escapeHtml(c.name)}</button></li>`)
    .join("");

  return {
    chapter: "welcome",
    kind: "welcome",
    title: t.chapters.welcome,
    html: `<div class="welcome">
<p class="hi"><span class="wave" aria-hidden="true">👋</span>${escapeHtml(t.welcome.hi)}</p>
<h1 class="title">${escapeHtml(t.welcome.title("")).trim()} <span class="grad">${escapeHtml(name)}</span></h1>
${p?.tagline ? `<p class="tagline">${text(p.tagline)}</p>` : ""}
<p class="lede">${escapeHtml(t.welcome.intro(minutes))}</p>
<button type="button" class="cta" data-next>${escapeHtml(t.welcome.start)} <span class="arrow" aria-hidden="true">→</span></button>
<div class="meta">${meta.join("")}</div>
${journey ? `<div class="journey-wrap"><p class="mini-label">${escapeHtml(t.welcome.journey)}</p><ul class="journey">${journey}</ul></div>` : ""}
</div>`,
  };
}

function finaleSlide(t: Copy, chapters: Chapter[], hasTasks: boolean): Slide {
  const recap = chapters
    .filter((c) => c.id !== "welcome" && c.id !== "finale")
    .map((c) => `<li style="--ch:${CHAPTER_HUES[c.id]}">${escapeHtml(c.name)}</li>`)
    .join("");
  return {
    chapter: "finale",
    kind: "finale",
    title: t.finale.title,
    html: `<div class="finale">
<span class="party" aria-hidden="true">🎉</span>
<h1 class="title">${escapeHtml(t.finale.title)}</h1>
<p class="lede">${escapeHtml(t.finale.lede)}</p>
${recap ? `<p class="mini-label">${escapeHtml(t.finale.recap)}</p><ul class="recap">${recap}</ul>` : ""}
${hasTasks ? `<p class="task-count" data-task-count data-template="${escapeHtml(t.finale.tasks)}"></p>` : ""}
<div class="actions"><button type="button" class="cta" data-go="0">↺ ${escapeHtml(t.finale.restart)}</button><button type="button" class="ghost" data-overview>${escapeHtml(t.finale.index)}</button></div>
</div>`,
  };
}

export function renderOnboarding(data: OnboardingData): string {
  const lang = data.meta?.language || "pt-BR";
  const t = copyFor(lang);
  const name = data.project?.name?.trim() || "Onboarding";

  if (data.meta?.status !== "filled") {
    return soloPage(lang, t, t.pending.title, t.pending.body, aiPrompt());
  }

  // 1. capítulos do meio, numerados só quando têm conteúdo
  const middle: { id: ChapterId; slides: Slide[] }[] = [];
  let num = 1;
  for (const [id, build] of CHAPTERS) {
    const slides = build({ data, t, num });
    if (slides.length) {
      middle.push({ id, slides });
      num++;
    }
  }

  // 2. índice de capítulos com a posição de cada um no deck
  const chapters: Chapter[] = [];
  let cursor = 1; // slide 0 é a boas-vindas
  chapters.push({ id: "welcome", num: 0, name: t.chapters.welcome, start: 0, count: 1 });
  middle.forEach((c, i) => {
    chapters.push({ id: c.id, num: i + 1, name: t.chapters[c.id], start: cursor, count: c.slides.length });
    cursor += c.slides.length;
  });
  chapters.push({ id: "finale", num: middle.length + 1, name: t.chapters.finale, start: cursor, count: 1 });

  const total = cursor + 1;
  const minutes = Math.max(3, Math.round(total * 0.4));
  const hasTasks = middle.some((c) => c.id === "mission");
  const slides: Slide[] = [welcomeSlide(data, t, chapters, minutes), ...middle.flatMap((c) => c.slides), finaleSlide(t, chapters, hasTasks)];

  const slideHtml = slides
    .map(
      (s, i) =>
        `<section class="slide" data-kind="${escapeHtml(s.kind ?? s.chapter)}" data-chapter="${s.chapter}" data-chapter-name="${escapeHtml(t.chapters[s.chapter])}" style="--h:${CHAPTER_HUES[s.chapter]}" aria-roledescription="slide" aria-label="${i + 1} / ${total}" aria-hidden="true"><div class="slide-inner">${s.html}</div></section>`,
    )
    .join("\n");

  const segments = chapters
    .map(
      (c) =>
        `<button type="button" class="seg" data-go="${c.start}" data-start="${c.start}" data-count="${c.count}" style="--h:${CHAPTER_HUES[c.id]};--w:${c.count}" title="${escapeHtml(c.name)}" aria-label="${escapeHtml(c.name)}"><span></span></button>`,
    )
    .join("");

  let index = 0;
  const overview = chapters
    .map((c) => {
      const items = slides
        .slice(c.start, c.start + c.count)
        .map((s) => `<button type="button" data-go="${index++}">${escapeHtml(s.title)}</button>`)
        .join("");
      return `<div class="ov-chapter" style="--ch:${CHAPTER_HUES[c.id]}"><h3><span class="n">${c.id === "welcome" ? "👋" : c.id === "finale" ? "🎉" : c.num}</span>${escapeHtml(c.name)}</h3>${items}</div>`;
    })
    .join("");

  const body = `<div class="deck">
<header class="topbar">
<span class="brand">${escapeHtml(name)}</span>
<nav class="segments" aria-label="${escapeHtml(t.ui.chapters)}">${segments}</nav>
<button type="button" class="icon-btn" data-overview title="${escapeHtml(t.ui.overview)} (O)" aria-label="${escapeHtml(t.ui.overview)}">${ICON_GRID}</button>
<button type="button" class="icon-btn" data-theme-toggle title="${escapeHtml(t.ui.theme)}" aria-label="${escapeHtml(t.ui.theme)}">${ICON_THEME}</button>
</header>
<main class="stage" id="ok-stage">
${slideHtml}
</main>
<footer class="controls">
<button type="button" class="nav-btn" data-prev aria-label="${escapeHtml(t.ui.prev)}">← <span class="txt">${escapeHtml(t.ui.prev)}</span></button>
<div class="where" aria-live="polite"><strong id="ok-chapter"></strong><span><span id="ok-count"></span><span class="hint" id="ok-hint"> · ${escapeHtml(t.ui.keys)}</span></span></div>
<button type="button" class="nav-btn primary" data-next aria-label="${escapeHtml(t.ui.next)}"><span class="txt">${escapeHtml(t.ui.next)}</span> →</button>
</footer>
</div>
<div class="overview" id="ok-overview" aria-hidden="true" role="dialog" aria-label="${escapeHtml(t.ui.overview)}">
<div class="overview-inner"><div class="overview-head"><h2>${escapeHtml(t.ui.overview)}</h2><button type="button" class="icon-btn" data-close aria-label="${escapeHtml(t.ui.close)}">✕</button></div><div class="ov-grid">${overview}</div></div>
</div>
<div class="toast" id="ok-toast" data-template="${escapeHtml(t.ui.resume)}" role="status"><span></span><button type="button" class="yes" data-resume="0">${escapeHtml(t.ui.resumeYes)}</button><button type="button" data-dismiss>${escapeHtml(t.ui.resumeNo)}</button></div>`;

  return shell(lang, `${name} · Onboarding`, body, { mermaid: slides.some((s) => s.kind === "diagram") && !isBlank(data.architecture?.diagram) });
}
