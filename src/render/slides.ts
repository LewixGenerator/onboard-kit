import type { MarkerScan } from "../facts";
import { filled, isBlank } from "../load";
import type { OnboardingData } from "../types";
import type { ChapterId, Copy } from "./copy";
import { chunk, escapeHtml, evidenceChip, evidenceList, hueFrom, initials, pad, text } from "./html";

export interface Slide {
  chapter: ChapterId;
  /** Título curto, usado no índice. */
  title: string;
  html: string;
  kind?: string;
}

export interface Ctx {
  data: OnboardingData;
  t: Copy;
  /** Número do capítulo (só capítulos com conteúdo contam). */
  num: number;
  /** Marcadores (TODO, NOTE...) lidos agora do código, quando a raiz do projeto é conhecida. */
  markers?: MarkerScan;
}

type Builder = (ctx: Ctx) => Slide[];

function head(ctx: Ctx, chapter: ChapterId, title: string, lede?: string, page?: [number, number]): string {
  const cont = page && page[1] > 1 ? ` <span class="cont">${page[0]}/${page[1]}</span>` : "";
  return `<p class="kicker"><span class="num">${ctx.num}</span>${escapeHtml(ctx.t.chapters[chapter])}</p>
<h1 class="title">${escapeHtml(title)}${cont}</h1>${lede && (!page || page[0] === 1) ? `<p class="lede">${text(lede)}</p>` : ""}`;
}

/** Monta uma sequência de slides paginando uma lista. */
function paged<T>(
  ctx: Ctx,
  chapter: ChapterId,
  items: T[],
  size: number,
  title: string,
  lede: string | undefined,
  body: (page: T[], offset: number) => string,
  kind?: string,
): Slide[] {
  const pages = chunk(items, size);
  return pages.map((page, i) => ({
    chapter,
    kind,
    title: pages.length > 1 ? `${title} (${i + 1}/${pages.length})` : title,
    html: `${head(ctx, chapter, title, lede, [i + 1, pages.length])}${body(page, i * size)}`,
  }));
}

/* ───────────────────────── capítulos ───────────────────────── */

const why: Builder = (ctx) => {
  const p = ctx.data.project;
  if (!p || isBlank(p.purpose)) return [];
  const { t } = ctx;
  const cards = [
    !isBlank(p.audience) ? `<div class="card"><span class="label">${t.why.audience}</span><p class="strong">${text(p.audience)}</p></div>` : "",
    !isBlank(p.status) ? `<div class="card"><span class="label">${t.why.status}</span><p class="strong">${text(p.status)}</p></div>` : "",
  ].join("");
  return [
    {
      chapter: "why",
      title: t.why.title,
      html: `${head(ctx, "why", t.why.title, t.why.lede)}<p class="statement">${text(p.purpose)}</p>${cards ? `<div class="grid-2 reveal">${cards}</div>` : ""}`,
    },
  ];
};

const business: Builder = (ctx) => {
  const b = ctx.data.business;
  if (!b) return [];
  const { t, data } = ctx;
  const slides: Slide[] = [];

  if (!isBlank(b.model) || !isBlank(b.valueProposition)) {
    const cards = [
      !isBlank(b.valueProposition)
        ? `<div class="card big-card"><span class="emoji" aria-hidden="true">💎</span><span class="label">${t.business.value}</span><p>${text(b.valueProposition)}</p></div>`
        : "",
      !isBlank(b.model)
        ? `<div class="card big-card"><span class="emoji" aria-hidden="true">🧭</span><span class="label">${t.business.model}</span><p>${text(b.model)}</p></div>`
        : "",
    ].join("");
    slides.push({ chapter: "business", title: t.business.title, html: `${head(ctx, "business", t.business.title, t.business.lede)}<div class="grid-2 reveal">${cards}</div>` });
  }

  const actors = filled(b.actors);
  slides.push(
    ...paged(ctx, "business", actors, 6, t.business.actorsTitle, t.business.actorsLede, (page) =>
      `<div class="grid reveal">${page
        .map(
          (a) =>
            `<div class="card actor"><span class="avatar" style="--ah:${hueFrom(a.name)}">${escapeHtml(initials(a.name))}</span><div><h3>${escapeHtml(a.name)}</h3><p>${text(a.description)}</p>${evidenceList(a.evidence, data)}</div></div>`,
        )
        .join("")}</div>`,
    ),
  );

  const flows = filled(b.flows);
  slides.push(
    ...paged(ctx, "business", flows, 2, t.business.flowsTitle, t.business.flowsLede, (page) =>
      page
        .map(
          (f) =>
            `<div class="flow"><h3>${escapeHtml(f.name)}</h3><ol class="chain reveal">${filled(f.steps)
              .map((s, i) => `<li><span class="step"><b>${i + 1}</b>${text(s)}</span></li>`)
              .join("")}</ol>${evidenceList(f.evidence, data)}</div>`,
        )
        .join(""),
    ),
  );
  return slides;
};

const product: Builder = (ctx) => {
  const { t, data } = ctx;
  return paged(ctx, "product", filled(data.features), 6, t.product.title, t.product.lede, (page) =>
    `<div class="grid reveal">${page
      .map(
        (f) =>
          `<div class="card feature"><div class="card-top"><h3>${escapeHtml(f.name)}</h3>${f.status ? `<span class="badge">${escapeHtml(f.status)}</span>` : ""}</div><p>${text(f.description)}</p>${evidenceList(f.entryPoints, data)}</div>`,
      )
      .join("")}</div>`,
  );
};

const language: Builder = (ctx) => {
  const { t, data } = ctx;
  const terms = filled(data.domain?.glossary);
  const slides = paged(ctx, "language", terms, 8, t.language.title, t.language.lede, (page) =>
    `<div class="flips reveal">${page
      .map(
        (g) =>
          `<button class="flip" type="button" aria-pressed="false"><span class="flip-inner"><span class="face front"><strong>${escapeHtml(g.term)}</strong><small>${t.language.tap} ↻</small></span><span class="face back">${text(g.definition)}</span></span></button>`,
      )
      .join("")}</div>`,
  );

  if (terms.length >= 3) {
    const picks = [...new Set([0, Math.floor(terms.length / 2), terms.length - 1])];
    const questions = picks
      .map((idx, qi) => {
        const right = terms[idx];
        const wrong = [terms[(idx + 1) % terms.length], terms[(idx + 2) % terms.length]];
        const options = [
          { label: right.definition, correct: true },
          ...wrong.map((w) => ({ label: w.definition, correct: false })),
        ];
        // embaralha de forma determinística, para a resposta certa não ficar sempre em primeiro
        const shift = (hueFrom(right.term) + qi) % 3;
        const rotated = options.slice(shift).concat(options.slice(0, shift));
        return `<div class="quiz-q" data-quiz data-right="${escapeHtml(t.language.right)}" data-wrong="${escapeHtml(t.language.wrong)}"><p class="q">${escapeHtml(t.language.question(right.term))}</p><div class="opts">${rotated
          .map((o) => `<button type="button" class="opt" data-correct="${o.correct ? 1 : 0}">${text(o.label)}</button>`)
          .join("")}</div><p class="feedback" aria-live="polite"></p></div>`;
      })
      .join("");
    slides.push({
      chapter: "language",
      kind: "quiz",
      title: t.language.quizTitle,
      html: `${head(ctx, "language", t.language.quizTitle, t.language.quizLede)}<div class="quiz reveal">${questions}</div><p class="score" data-quiz-score data-template="${escapeHtml(t.language.score)}" aria-live="polite"></p>`,
    });
  }
  return slides;
};

const rules: Builder = (ctx) => {
  const { t, data } = ctx;
  return paged(ctx, "rules", filled(data.domain?.businessRules), 3, t.rules.title, t.rules.lede, (page, offset) =>
    `<div class="rules reveal">${page
      .map(
        (r, i) =>
          `<div class="card rule"><span class="rule-num" aria-label="${t.rules.rule} ${offset + i + 1}">${pad(offset + i + 1)}</span><div><h3>${escapeHtml(r.title)}</h3><p>${text(r.description)}</p>${evidenceList(r.evidence, data)}</div></div>`,
      )
      .join("")}</div>`,
  );
};

const stack: Builder = (ctx) => {
  const { t, data } = ctx;
  const items = filled(data.stack).sort((a, b) => (a.category || "").localeCompare(b.category || ""));
  return paged(ctx, "stack", items, 6, t.stack.title, t.stack.lede, (page) =>
    `<div class="grid reveal">${page
      .map(
        (s) =>
          `<div class="card tech"><div class="tech-head"><span class="logo" style="--th:${hueFrom(s.name)}">${escapeHtml(initials(s.name))}</span><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml([s.category, s.version].filter(Boolean).join(" · "))}</small></div></div><p>${text(s.why)}</p>${evidenceList(s.evidence, data)}</div>`,
      )
      .join("")}</div>`,
  );
};

const architecture: Builder = (ctx) => {
  const { t, data } = ctx;
  const a = data.architecture;
  if (!a) return [];
  const slides: Slide[] = [];
  const style = a.style?.trim();
  const patterns = filled(a.patterns).slice(0, 6);
  if (style || patterns.length) {
    slides.push({
      chapter: "architecture",
      title: t.architecture.styleTitle,
      html: `${head(ctx, "architecture", t.architecture.styleTitle, t.architecture.styleLede)}${style ? `<p class="statement">${text(style)}</p>` : ""}${
        patterns.length
          ? `<p class="mini-label">${t.architecture.patterns}</p><div class="grid reveal">${patterns
              .map((p) => `<div class="card"><h3>${escapeHtml(p.name)}</h3><p>${text(p.description)}</p>${evidenceList(p.evidence, data)}</div>`)
              .join("")}</div>`
          : ""
      }`,
    });
  }
  if (!isBlank(a.summary) || !isBlank(a.diagram)) {
    const hasDiagram = !isBlank(a.diagram);
    slides.push({
      chapter: "architecture",
      kind: hasDiagram ? "diagram" : undefined,
      title: t.architecture.title,
      html: `${head(ctx, "architecture", t.architecture.title, hasDiagram ? a.summary : undefined)}${
        hasDiagram ? `<div class="diagram reveal"><pre class="mermaid">${escapeHtml(a.diagram)}</pre></div>` : `<p class="statement">${text(a.summary)}</p>`
      }`,
    });
  }
  slides.push(
    ...paged(ctx, "architecture", filled(a.modules), 6, t.architecture.modulesTitle, t.architecture.modulesLede, (page) =>
      `<div class="modules reveal">${page
        .map(
          (m) =>
            `<div class="module"><div><strong>${escapeHtml(m.name)}</strong><code>${escapeHtml(m.path)}</code></div><p>${text(m.responsibility)}</p></div>`,
        )
        .join("")}</div>`,
    ),
  );
  // as decisões explicam o desenho, então fecham o capítulo de arquitetura
  slides.push(...decisions({ ...ctx }, "architecture"));
  return slides;
};

const setup: Builder = (ctx) => {
  const { t, data } = ctx;
  const gs = data.gettingStarted;
  if (!gs) return [];
  const slides: Slide[] = [];
  const prereq = filled(gs.prerequisites);
  const steps = filled(gs.setup);
  if (prereq.length || steps.length) {
    slides.push({
      chapter: "setup",
      title: t.setup.title,
      html: `${head(ctx, "setup", t.setup.title, t.setup.lede)}${
        prereq.length ? `<p class="mini-label">${t.setup.prereq}</p><ul class="pills reveal">${prereq.map((p) => `<li>${text(p)}</li>`).join("")}</ul>` : ""
      }${steps.length ? `<ol class="steps reveal">${steps.map((s) => `<li><span>${text(s)}</span></li>`).join("")}</ol>` : ""}`,
    });
  }
  slides.push(
    ...paged(ctx, "setup", filled(gs.commands), 6, t.setup.commandsTitle, t.setup.commandsLede, (page) =>
      `<div class="terminal reveal"><div class="term-bar" aria-hidden="true"><i></i><i></i><i></i></div>${page
        .map(
          (c) =>
            `<div class="cmd"><div><code>${escapeHtml(c.command)}</code>${c.description ? `<p>${text(c.description)}</p>` : ""}</div><button type="button" class="copy" data-copy="${escapeHtml(c.command)}" data-done="${escapeHtml(t.setup.copied)}">${t.setup.copy}</button></div>`,
        )
        .join("")}</div>`,
    ),
  );
  slides.push(
    ...paged(ctx, "setup", filled(gs.envVars), 8, t.setup.envTitle, t.setup.envLede, (page) =>
      `<div class="grid reveal">${page
        .map(
          (v) =>
            `<div class="card env"><div class="card-top"><code>${escapeHtml(v.name)}</code><span class="badge ${v.required ? "badge-strong" : ""}">${v.required ? t.setup.required : t.setup.optional}</span></div><p>${text(v.description)}</p></div>`,
        )
        .join("")}</div>`,
    ),
  );
  return slides;
};

const conventions: Builder = (ctx) => {
  const { t, data } = ctx;
  return paged(ctx, "conventions", filled(data.conventions), 2, t.conventions.title, t.conventions.lede, (page) =>
    `<div class="grid-2 reveal">${page
      .map(
        (c) =>
          `<div class="card convention"><h3>${escapeHtml(c.title)}</h3><p>${text(c.description)}</p>${c.example?.trim() ? `<pre><code>${escapeHtml(c.example)}</code></pre>` : ""}${evidenceList(c.evidence, data)}</div>`,
      )
      .join("")}</div>`,
  );
};

const tours: Builder = (ctx) => {
  const { t, data } = ctx;
  const slides: Slide[] = [];
  for (const tour of filled(data.tours)) {
    const steps = filled(tour.steps);
    if (!steps.length) continue;
    slides.push({
      chapter: "tours",
      title: tour.title,
      html: `<p class="kicker"><span class="num">${ctx.num}</span>${escapeHtml(t.tours.kicker)}</p><h1 class="title">${escapeHtml(tour.title)}</h1><p class="lede">${text(tour.description || t.tours.intro)}</p><p class="mini-label">${t.tours.stops}</p><ol class="route reveal">${steps
        .map((s) => `<li><code>${escapeHtml(s.file)}</code></li>`)
        .join("")}</ol>`,
    });
    steps.forEach((s, i) => {
      slides.push({
        chapter: "tours",
        kind: "tour-step",
        title: `${tour.title} · ${i + 1}`,
        html: `<p class="kicker"><span class="num">${ctx.num}</span>${escapeHtml(tour.title)}</p><div class="tour-step"><span class="bignum" aria-hidden="true">${pad(i + 1)}</span><div><p class="mini-label">${escapeHtml(t.tours.stop(i + 1, steps.length))}</p>${evidenceChip(s.file, data, "ev-lg")}<p class="statement small">${text(s.explanation)}</p><div class="stops" aria-hidden="true">${steps
          .map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`)
          .join("")}</div></div></div>`,
      });
    });
  }
  return slides;
};

const gotchas: Builder = (ctx) => {
  const { t, data } = ctx;
  return paged(ctx, "gotchas", filled(data.gotchas).slice(0, 6), 3, t.gotchas.title, t.gotchas.lede, (page) =>
    `<div class="stack-list reveal">${page
      .map((g) => `<div class="card gotcha"><span class="emoji" aria-hidden="true">🍌</span><div><h3>${escapeHtml(g.title)}</h3><p>${text(g.description)}</p>${evidenceList(g.evidence, data)}</div></div>`)
      .join("")}</div>`,
  );
};

function decisions(ctx: Ctx, chapter: ChapterId = "decisions"): Slide[] {
  const { t, data } = ctx;
  return paged(ctx, chapter, filled(data.decisions), 2, t.decisions.title, t.decisions.lede, (page) =>
    `<div class="stack-list reveal">${page
      .map(
        (d) =>
          `<div class="card decision"><h3>${escapeHtml(d.title)}</h3><div class="split">${d.context ? `<div><span class="label">${t.decisions.context}</span><p>${text(d.context)}</p></div>` : ""}${d.decision ? `<div><span class="label">${t.decisions.decision}</span><p>${text(d.decision)}</p></div>` : ""}</div>${evidenceList(d.evidence, data)}</div>`,
      )
      .join("")}</div>`,
  );
}


/** Selo colorido para o tipo de marcador (TODO, FIXME, WARNING...). */
function kindBadge(kind: string | undefined): string {
  const k = (kind || "").trim().toUpperCase();
  if (!k) return "";
  return `<span class="kind kind-${escapeHtml(k.toLowerCase())}">${escapeHtml(k)}</span>`;
}

const workflow: Builder = (ctx) => {
  const { t, data } = ctx;
  const w = data.workflow;
  if (!w) return [];
  const slides: Slide[] = [];

  const b = w.branching;
  const branches = filled(b?.branches).slice(0, 6);
  if (b && (!isBlank(b.model) || !isBlank(b.description) || branches.length)) {
    const facts = [
      !isBlank(b.model) ? `<div class="fact"><span class="label">${t.workflow.model}</span><strong>${escapeHtml(b.model)}</strong></div>` : "",
      !isBlank(b.mainBranch) ? `<div class="fact"><span class="label">${t.workflow.main}</span><code>${escapeHtml(b.mainBranch)}</code></div>` : "",
    ].join("");
    slides.push({
      chapter: "workflow",
      title: t.workflow.branchesTitle,
      html: `${head(ctx, "workflow", t.workflow.branchesTitle, t.workflow.branchesLede)}${facts ? `<div class="facts reveal">${facts}</div>` : ""}${
        !isBlank(b.description) ? `<p class="statement small">${text(b.description)}</p>` : ""
      }${
        branches.length
          ? `<div class="branch-map reveal"><div class="trunk"><code>${escapeHtml(b.mainBranch || "main")}</code></div>${branches
              .map((br) => `<div class="branch"><code>${escapeHtml(br.pattern)}</code><span>${text(br.purpose)}</span></div>`)
              .join("")}</div>`
          : ""
      }${evidenceList(b.evidence, data)}`,
    });
  }

  const c = w.commits;
  const examples = filled(c?.examples).slice(0, 4);
  if (c && (!isBlank(c.format) || examples.length)) {
    const badges = [
      !isBlank(c.convention) ? `<span class="badge">${escapeHtml(c.convention)}</span>` : "",
      !isBlank(c.enforcedBy) ? `<span class="badge badge-strong">${escapeHtml(t.workflow.enforced)} ${escapeHtml(c.enforcedBy)}</span>` : "",
    ].join("");
    slides.push({
      chapter: "workflow",
      title: t.workflow.commitsTitle,
      html: `${head(ctx, "workflow", t.workflow.commitsTitle, t.workflow.commitsLede)}${
        !isBlank(c.format)
          ? `<div class="commit-format reveal"><span class="label">${t.workflow.format}</span><code>${escapeHtml(c.format)}</code>${badges ? `<div class="badges">${badges}</div>` : ""}</div>`
          : badges
            ? `<div class="badges">${badges}</div>`
            : ""
      }${
        examples.length
          ? `<p class="mini-label">${t.workflow.examples}</p><div class="terminal reveal"><div class="term-bar" aria-hidden="true"><i></i><i></i><i></i></div>${examples
              .map((e) => `<div class="cmd"><div><code>git commit -m "${escapeHtml(e)}"</code></div></div>`)
              .join("")}</div>`
          : ""
      }${evidenceList(c.evidence, data)}`,
    });
  }

  const pr = w.pullRequests;
  const checklist = filled(pr?.checklist).slice(0, 5);
  const rel = w.release;
  const envs = filled(rel?.environments);
  const hasPr = pr && (!isBlank(pr.process) || checklist.length);
  const hasRelease = rel && (!isBlank(rel.process) || envs.length);
  if (hasPr || hasRelease) {
    const prCard = hasPr
      ? `<div class="card"><span class="emoji" aria-hidden="true">🔀</span><span class="label">${t.workflow.pr}</span>${!isBlank(pr!.process) ? `<p>${text(pr!.process)}</p>` : ""}${
          checklist.length ? `<p class="mini-label sub">${t.workflow.checklist}</p><ul class="checklist">${checklist.map((i) => `<li>${text(i)}</li>`).join("")}</ul>` : ""
        }${evidenceList(pr!.evidence, data)}</div>`
      : "";
    const relCard = hasRelease
      ? `<div class="card"><span class="emoji" aria-hidden="true">🚀</span><span class="label">${t.workflow.release}</span>${!isBlank(rel!.process) ? `<p>${text(rel!.process)}</p>` : ""}${
          envs.length
            ? `<ol class="chain envs">${envs.map((e, i) => `<li><span class="step" title="${escapeHtml(e.description)}"><b>${i + 1}</b><span>${escapeHtml(e.name)}${e.trigger ? `<small>${escapeHtml(e.trigger)}</small>` : ""}</span></span></li>`).join("")}</ol>`
            : ""
        }${evidenceList(rel!.evidence, data)}</div>`
      : "";
    slides.push({
      chapter: "workflow",
      title: t.workflow.prTitle,
      html: `${head(ctx, "workflow", t.workflow.prTitle, t.workflow.prLede)}<div class="grid-2 reveal">${prCard}${relCard}</div>`,
    });
  }
  return slides;
};

const quality: Builder = (ctx) => {
  const { t, data } = ctx;
  const q = data.quality;
  if (!q) return [];
  const slides: Slide[] = [];
  const tst = q.testing;
  const checks = filled(q.checks).slice(0, 6);
  const hasTesting = tst && (!isBlank(tst.approach) || !isBlank(tst.command));
  if (!hasTesting && !checks.length) return [];

  const testing = hasTesting
    ? `${!isBlank(tst.approach) ? `<p class="statement small">${text(tst.approach)}</p>` : ""}<div class="facts reveal">${
        !isBlank(tst.location) ? `<div class="fact"><span class="label">${t.quality.where}</span><code>${escapeHtml(tst.location)}</code></div>` : ""
      }${
        !isBlank(tst.command)
          ? `<div class="fact"><span class="label">${t.quality.run}</span><span class="inline-cmd"><code>${escapeHtml(tst.command)}</code><button type="button" class="copy" data-copy="${escapeHtml(tst.command)}" data-done="${escapeHtml(t.setup.copied)}">${t.setup.copy}</button></span></div>`
          : ""
      }</div>${evidenceList(tst.evidence, data)}`
    : "";
  const checkList = checks.length
    ? `<p class="mini-label sub">${t.quality.checks}</p><ol class="timeline reveal">${checks
        .map((c) => `<li><span class="when">${escapeHtml(c.when || "•")}</span><div><strong>${escapeHtml(c.name)}</strong>${c.description ? `<p>${text(c.description)}</p>` : ""}${evidenceList(c.evidence, data)}</div></li>`)
        .join("")}</ol>`
    : "";

  // poucas verificações cabem junto com os testes; muitas ganham um slide próprio
  if (hasTesting && checks.length > 3) {
    slides.push({ chapter: "quality", title: t.quality.title, html: `${head(ctx, "quality", t.quality.title, t.quality.lede)}${testing}` });
    slides.push({ chapter: "quality", title: t.quality.checks, html: `${head(ctx, "quality", t.quality.checks)}${checkList}` });
  } else {
    slides.push({ chapter: "quality", title: t.quality.title, html: `${head(ctx, "quality", t.quality.title, t.quality.lede)}${testing}${checkList}` });
  }
  return slides;
};

const docs: Builder = (ctx) => {
  const { t, data } = ctx;
  const slides = paged(ctx, "docs", filled(data.docs).slice(0, 6), 6, t.docs.title, t.docs.lede, (page) =>
    `<div class="grid reveal">${page
      .map((d) => `<div class="card doc"><span class="emoji" aria-hidden="true">📘</span><h3>${escapeHtml(d.title)}</h3><p>${text(d.why)}</p><div class="evidence">${evidenceChip(d.file, data)}</div></div>`)
      .join("")}</div>`,
  );
  slides.push(
    ...paged(ctx, "docs", filled(data.codeNotes).slice(0, 6), 3, t.docs.notesTitle, t.docs.notesLede, (page) =>
      `<div class="stack-list reveal">${page
        .map(
          (n) =>
            `<div class="card note"><div class="card-top"><h3>${escapeHtml(n.title)}</h3>${kindBadge(n.kind)}</div><p>${text(n.description)}</p><div class="evidence">${evidenceChip(n.file, data)}</div></div>`,
        )
        .join("")}</div>`,
    ),
  );
  return slides;
};

/** TODOs por pasta; se tudo estiver numa pasta só (ex.: src/), desce um nível para o gráfico dizer algo. */
function todoFolders(markers: MarkerScan): Record<string, number> {
  if (Object.keys(markers.byFolder).length > 1) return markers.byFolder;
  const out: Record<string, number> = {};
  for (const item of markers.items) {
    if (!["TODO", "FIXME", "HACK", "XXX", "BUG"].includes(item.kind)) continue;
    const parts = item.file.split(":")[0].split("/");
    const folder = parts.length > 2 ? `${parts[0]}/${parts[1]}` : parts.length > 1 ? parts[0] : ".";
    out[folder] = (out[folder] ?? 0) + 1;
  }
  return out;
}

const todos: Builder = (ctx) => {
  const { t, data, markers } = ctx;
  const slides: Slide[] = [];
  const kinds = ["TODO", "FIXME", "HACK", "XXX", "BUG"].filter((k) => (markers?.counts[k] ?? 0) > 0);
  const total = kinds.reduce((sum, k) => sum + (markers?.counts[k] ?? 0), 0);

  if (markers && total > 0) {
    const folders = Object.entries(todoFolders(markers))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const max = folders[0]?.[1] ?? 1;
    slides.push({
      chapter: "todos",
      kind: "todo-stats",
      title: t.todos.title,
      html: `${head(ctx, "todos", t.todos.title, t.todos.lede)}<div class="todo-total reveal"><strong data-count="${total}">${total}</strong><span>${escapeHtml(t.todos.total)}<small>${escapeHtml(t.todos.live)}</small></span></div><div class="kind-counts reveal">${kinds
        .map((k) => `<div class="kind-count">${kindBadge(k)}<strong data-count="${markers.counts[k]}">${markers.counts[k]}</strong></div>`)
        .join("")}</div>${
        folders.length > 1
          ? `<p class="mini-label">${t.todos.byFolder}</p><div class="bars reveal">${folders
              .map(([folder, n]) => `<div class="bar"><code>${escapeHtml(folder === "." ? "/" : `${folder}/`)}</code><span class="track"><span style="--p:${Math.round((n / max) * 100)}%"></span></span><b>${n}</b></div>`)
              .join("")}</div>`
          : ""
      }`,
    });
  }

  slides.push(
    ...paged(ctx, "todos", filled(data.todos).slice(0, 8), 4, t.todos.highlights, slides.length ? undefined : t.todos.lede, (page) =>
      `<div class="grid-2 reveal">${page
        .map(
          (td) =>
            `<div class="card todo"><div class="card-top"><h3>${escapeHtml(td.title)}</h3>${kindBadge(td.kind)}</div>${td.description ? `<p>${text(td.description)}</p>` : ""}${
              td.impact ? `<p class="impact"><span class="label">${t.todos.impact}</span>${text(td.impact)}</p>` : ""
            }<div class="evidence">${evidenceChip(td.file, data)}</div></div>`,
        )
        .join("")}</div>`,
    ),
  );
  return slides;
};

const CHEAT_COMMANDS = /\b(dev|start|test|lint|typecheck|type-check|build|format|e2e)\b/i;

const cheatsheet: Builder = (ctx) => {
  const { t, data } = ctx;
  const w = data.workflow;
  const tile = (label: string, value: string, copy = false) =>
    `<div class="cheat"><span class="label">${escapeHtml(label)}</span><code>${escapeHtml(value)}</code>${
      copy ? `<button type="button" class="copy" data-copy="${escapeHtml(value)}" data-done="${escapeHtml(t.setup.copied)}">${t.setup.copy}</button>` : ""
    }</div>`;

  const tiles: string[] = [];
  if (w?.branching?.mainBranch?.trim()) tiles.push(tile(t.cheatsheet.main, w.branching.mainBranch));
  const branch = filled(w?.branching?.branches)[0];
  if (branch) tiles.push(tile(t.cheatsheet.branch, branch.pattern));
  if (w?.commits?.format?.trim()) tiles.push(tile(t.cheatsheet.commit, w.commits.format));

  const commands = filled(data.gettingStarted?.commands).filter((c) => CHEAT_COMMANDS.test(`${c.name} ${c.command}`));
  const testCmd = data.quality?.testing?.command?.trim();
  if (testCmd && !commands.some((c) => c.command.trim() === testCmd)) commands.push({ name: "test", command: testCmd, description: "" });
  for (const c of commands.slice(0, 4)) tiles.push(tile(c.name || c.command, c.command, true));

  // sem Git nem comandos, a cola não ajuda: o capítulo some
  if (tiles.length < 3) return [];

  const extras = [
    w?.pullRequests?.process?.trim() ? `<div class="card"><span class="label">${t.cheatsheet.pr}</span><p>${text(w.pullRequests.process)}</p></div>` : "",
    filled(data.docs)[0]
      ? `<div class="card"><span class="label">${t.cheatsheet.read}</span><p>${escapeHtml(filled(data.docs)[0].title)}</p><div class="evidence">${evidenceChip(filled(data.docs)[0].file, data)}</div></div>`
      : "",
  ].join("");

  return [
    {
      chapter: "cheatsheet",
      kind: "cheatsheet",
      title: t.cheatsheet.title,
      html: `${head(ctx, "cheatsheet", t.cheatsheet.title, t.cheatsheet.lede)}<div class="cheats reveal">${tiles.join("")}</div>${extras ? `<div class="grid-2 reveal cheat-extras">${extras}</div>` : ""}`,
    },
  ];
};

const mission: Builder = (ctx) => {
  const { t, data } = ctx;
  return paged(ctx, "mission", filled(data.firstTasks), 5, t.mission.title, t.mission.lede, (page) =>
    `<div class="tasks reveal">${page
      .map((task) => {
        const id = `task-${hueFrom(task.title)}-${task.title.length}`;
        return `<label class="task"><input type="checkbox" data-task="${id}"><span><strong>${escapeHtml(task.title)}</strong><span class="task-desc">${text(task.description)}</span>${evidenceList(task.files, data)}</span></label>`;
      })
      .join("")}</div>`,
  );
};

/** Capítulos do meio, em ordem narrativa: do porquê ao código. */
export const CHAPTERS: [ChapterId, Builder][] = [
  ["why", why],
  ["business", business],
  ["product", product],
  ["language", language],
  ["rules", rules],
  ["stack", stack],
  ["architecture", architecture],
  ["setup", setup],
  ["conventions", conventions],
  ["workflow", workflow],
  ["quality", quality],
  ["docs", docs],
  ["tours", tours],
  ["gotchas", gotchas],
  ["todos", todos],
  ["mission", mission],
  ["cheatsheet", cheatsheet],
];
