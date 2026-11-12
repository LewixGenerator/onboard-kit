import { isAchromatic, packageName, resolveBrand, toHex, type ResolvedBrand } from "../brand";
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

export interface RenderOptions {
  /** Raiz do projeto: usada para detectar cores e logo quando o JSON não traz `brand`. */
  root?: string;
}

interface Theme {
  brand: ResolvedBrand;
  hues: Record<ChapterId, number>;
  /** Matiz principal da marca (ou o padrão do kit). */
  hue: number;
  css: string;
  mono: boolean;
}

const HUE_OFFSETS = [0, 18, -18, 36, -36];

/**
 * Tema a partir das cores da marca. Sem cores, mantém a paleta própria do kit.
 * Com uma cor, os capítulos variam levemente em torno dela; com várias, se revezam entre elas.
 * Marcas sem cor (preto/cinza) viram um tema monocromático.
 */
function themeFor(brand: ResolvedBrand): Theme {
  const chromatic = brand.colors.filter((c) => !isAchromatic(c)).map((c) => ({ ...c, h: Math.round(c.h) }));
  const ref = chromatic[0] ?? (brand.colors[0] && { ...brand.colors[0], h: Math.round(brand.colors[0].h) });
  if (!ref) return { brand, hues: CHAPTER_HUES, hue: CHAPTER_HUES.welcome, css: "", mono: false };

  const mono = chromatic.length === 0;
  const hues = { ...CHAPTER_HUES };
  hues.welcome = hues.finale = ref.h;
  CHAPTERS.forEach(([id], i) => {
    hues[id] = chromatic.length > 1 ? chromatic[i % chromatic.length].h : (ref.h + HUE_OFFSETS[i % HUE_OFFSETS.length] + 360) % 360;
  });
  const k = mono ? 0 : Math.round(Math.min(1, ref.s / 55) * 100) / 100;
  const h2 = chromatic[1]?.h ?? (ref.h + 28) % 360;
  const css = `:root{--brand-h:${ref.h};--h2:${h2};--k:${k};--brand-c:hsl(${ref.h} calc(var(--as) * ${k}) var(--al));--brand-on:var(--on-accent)}`;
  return { brand, hues, hue: ref.h, css, mono };
}

function shell(
  lang: string,
  title: string,
  body: string,
  theme: Theme,
  opts: { mermaid?: boolean; solo?: boolean; state?: string } = {},
): string {
  const palette = theme.brand.colors.map(toHex).join(" ");
  return `<!doctype html>
<html lang="${escapeHtml(lang)}"${theme.mono ? " data-mono" : ""}${palette ? ` data-palette="${palette}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
${theme.brand.favicon ? `<link rel="icon" href="${escapeHtml(theme.brand.favicon)}">` : ""}
${theme.brand.colors[0] ? `<meta name="theme-color" content="${toHex(theme.brand.colors[0])}">` : ""}
${FONTS}
<style>${CSS}${theme.css}</style>
</head>
<body${opts.solo ? ' class="solo"' : ""}${opts.state ? ` data-ok-state="${opts.state}"` : ""}>
<div class="backdrop" id="ok-backdrop" style="--bh:${theme.hue}" aria-hidden="true"><i></i><i></i><i></i></div>
${body}
<script>${JS}</script>
${opts.mermaid ? `<script src="${MERMAID_URL}" onload="window.__okMermaid&&window.__okMermaid()"></script>` : ""}
</body>
</html>`;
}

function logoImg(theme: Theme, cls: string): string {
  return theme.brand.logo ? `<span class="${cls}"><img src="${escapeHtml(theme.brand.logo)}" alt=""></span>` : "";
}

function soloHead(theme: Theme, name: string | undefined, heading: string, body: string): string {
  const kicker = `<p class="kicker"><span class="num">👋</span>${escapeHtml(name ?? "onboarding-kit")}</p>`;
  return `${logoImg(theme, "solo-logo")}${kicker}<h1>${escapeHtml(heading)}</h1>${body ? `<p>${escapeHtml(body)}</p>` : ""}`;
}

function promptBlock(t: Copy, prompt: string): string {
  return `<ol class="solo-steps">${t.pending.steps.map((step, i) => `<li><b>${i + 1}</b><span>${escapeHtml(step)}</span></li>`).join("")}</ol>
<div class="prompt-box"><pre class="prompt-text">${escapeHtml(prompt)}</pre><button type="button" class="cta copy-cta" data-copy="${escapeHtml(prompt)}" data-done="✓ ${escapeHtml(t.pending.copied)}">${escapeHtml(t.pending.copy)}</button></div>`;
}

function waiting(t: Copy): string {
  return `<p class="waiting" aria-live="polite"><span class="pulse" aria-hidden="true"></span>${escapeHtml(t.pending.waiting)}</p>`;
}

/** Seções do JSON acompanhadas na tela de espera enquanto a IA preenche. */
const PROGRESS_SECTIONS = ["project", "business", "features", "domain", "stack", "architecture", "gettingStarted", "conventions", "tours", "gotchas", "decisions", "firstTasks", "brand"] as const;

function progressBlock(data: OnboardingData, t: Copy): string {
  const items = PROGRESS_SECTIONS.map((key) => ({ key, done: !isBlank((data as unknown as Record<string, unknown>)[key]) }));
  const done = items.filter((i) => i.done).length;
  return `<div class="progress" id="ok-progress"><p class="mini-label">${escapeHtml(t.pending.progress.replace("{done}", String(done)).replace("{total}", String(items.length)))}</p><div class="progress-bar"><span style="width:${Math.round((done / items.length) * 100)}%"></span></div><ul class="progress-list">${items
    .map((i) => `<li data-key="${i.key}"${i.done ? ' class="is-done"' : ""}>${escapeHtml(t.pending.sections[i.key])}</li>`)
    .join("")}</ul></div>`;
}

function soloPage(lang: string, title: string, inner: string, theme: Theme, state: string): string {
  return shell(lang, title, `<div class="solo-wrap" style="--h:${theme.hue}"><div class="solo-card">${inner}</div></div>`, theme, { solo: true, state });
}

export function renderMissingPage(root?: string): string {
  const t = copyFor("pt-BR");
  const theme = themeFor(resolveBrand(undefined, root));
  const name = packageName(root);
  const inner = `${soloHead(theme, name, t.missing.title, t.missing.body)}${promptBlock(t, aiPrompt(undefined, { init: true }))}${waiting(t)}<p class="manual">${escapeHtml(t.missing.manual)} <code>npx onboarding-kit init</code></p>`;
  return soloPage("pt-BR", name ? `${name} · Onboarding` : "Onboarding", inner, theme, "missing");
}

export function renderErrorPage(message: string, root?: string): string {
  const t = copyFor("pt-BR");
  const theme = themeFor(resolveBrand(undefined, root));
  const name = packageName(root);
  const inner = `${soloHead(theme, name, t.invalid.title, t.invalid.body)}<pre class="error-text">${escapeHtml(message)}</pre>${waiting(t)}`;
  return soloPage("pt-BR", "Onboarding", inner, theme, "error");
}

function renderPendingPage(data: OnboardingData, root: string | undefined, lang: string, t: Copy): string {
  const theme = themeFor(resolveBrand(data, root));
  const name = data.project?.name?.trim() || packageName(root);
  const inner = `${soloHead(theme, name, t.pending.title, t.pending.body)}${promptBlock(t, aiPrompt())}${waiting(t)}${progressBlock(data, t)}`;
  return soloPage(lang, name ? `${name} · Onboarding` : "Onboarding", inner, theme, "pending");
}

function welcomeSlide(data: OnboardingData, t: Copy, chapters: Chapter[], minutes: number, theme: Theme): Slide {
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
    .map((c) => `<li><button type="button" data-go="${c.start}" style="--ch:${theme.hues[c.id]}"><span class="n">${c.num}</span>${escapeHtml(c.name)}</button></li>`)
    .join("");

  return {
    chapter: "welcome",
    kind: "welcome",
    title: t.chapters.welcome,
    html: `<div class="welcome">
${logoImg(theme, "brand-logo")}
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

function finaleSlide(t: Copy, chapters: Chapter[], hasTasks: boolean, theme: Theme): Slide {
  const recap = chapters
    .filter((c) => c.id !== "welcome" && c.id !== "finale")
    .map((c) => `<li style="--ch:${theme.hues[c.id]}">${escapeHtml(c.name)}</li>`)
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

export function renderOnboarding(data: OnboardingData, options: RenderOptions = {}): string {
  const lang = data.meta?.language || "pt-BR";
  const t = copyFor(lang);
  const name = data.project?.name?.trim() || "Onboarding";

  if (data.meta?.status !== "filled") {
    return renderPendingPage(data, options.root, lang, t);
  }
  const theme = themeFor(resolveBrand(data, options.root));

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
  const slides: Slide[] = [welcomeSlide(data, t, chapters, minutes, theme), ...middle.flatMap((c) => c.slides), finaleSlide(t, chapters, hasTasks, theme)];
  const chapterNum = (id: ChapterId) => (id === "welcome" ? "👋" : id === "finale" ? "🎉" : String(chapters.find((c) => c.id === id)?.num ?? ""));

  const slideHtml = slides
    .map(
      (s, i) =>
        `<section class="slide" data-kind="${escapeHtml(s.kind ?? s.chapter)}" data-chapter="${s.chapter}" data-chapter-name="${escapeHtml(t.chapters[s.chapter])}" data-chapter-num="${chapterNum(s.chapter)}" style="--h:${theme.hues[s.chapter]}" aria-roledescription="slide" aria-label="${i + 1} / ${total}" aria-hidden="true"><div class="slide-inner">${s.html}</div></section>`,
    )
    .join("\n");

  const segments = chapters
    .map(
      (c) =>
        `<button type="button" class="seg" data-go="${c.start}" data-start="${c.start}" data-count="${c.count}" style="--h:${theme.hues[c.id]};--w:${c.count}" title="${escapeHtml(c.name)}" aria-label="${escapeHtml(c.name)}"><span></span></button>`,
    )
    .join("");

  let index = 0;
  const overview = chapters
    .map((c) => {
      const items = slides
        .slice(c.start, c.start + c.count)
        .map((s) => `<button type="button" data-go="${index++}">${escapeHtml(s.title)}</button>`)
        .join("");
      return `<div class="ov-chapter" style="--ch:${theme.hues[c.id]}"><h3><span class="n">${chapterNum(c.id)}</span>${escapeHtml(c.name)}</h3>${items}</div>`;
    })
    .join("");

  const body = `<div class="deck">
<header class="topbar">
<span class="brand">${logoImg(theme, "brand-mark")}<span class="brand-name">${escapeHtml(name)}</span></span>
<nav class="segments" aria-label="${escapeHtml(t.ui.chapters)}">${segments}</nav>
<button type="button" class="icon-btn" data-overview title="${escapeHtml(t.ui.overview)} (O)" aria-label="${escapeHtml(t.ui.overview)}">${ICON_GRID}</button>
<button type="button" class="icon-btn" data-theme-toggle title="${escapeHtml(t.ui.theme)}" aria-label="${escapeHtml(t.ui.theme)}">${ICON_THEME}</button>
</header>
<main class="stage" id="ok-stage">
${slideHtml}
<div class="wipe" id="ok-wipe" aria-hidden="true"><span></span><strong></strong></div>
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

  return shell(lang, `${name} · Onboarding`, body, theme, { mermaid: slides.some((s) => s.kind === "diagram") && !isBlank(data.architecture?.diagram) });
}
