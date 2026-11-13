import { hslToRgb, type Hsl } from "../brand";

/** O que o banner do `serve` mostra. */
export interface BannerInfo {
  version: string;
  url: string;
  lang: "pt" | "en";
  /** Nome e tagline do projeto, quando o onboarding já foi preenchido. */
  project?: { name: string; tagline?: string };
  status: "filled" | "pending" | "missing" | "invalid";
  file: string;
  slides?: number;
  chapters?: number;
  coverage?: number;
  tracks?: { id: string; name: string }[];
  generatedAt?: string;
  readyMs: number;
  /** Cores da marca, a principal primeiro. */
  colors: Hsl[];
}

type Rgb = [number, number, number];

const ANSI = /\x1b\[[0-9;]*m/g;
const visible = (s: string) => [...s.replace(ANSI, "")].length;

export interface Painter {
  color: boolean;
  truecolor: boolean;
}

export function painter(stream: NodeJS.WriteStream = process.stdout): Painter {
  const color = Boolean(stream.isTTY) && !process.env.NO_COLOR;
  const truecolor = color && (/truecolor|24bit/i.test(process.env.COLORTERM ?? "") || process.env.TERM_PROGRAM === "iTerm.app" || process.env.TERM_PROGRAM === "vscode" || Boolean(process.env.WT_SESSION));
  return { color, truecolor };
}

/** Cor ANSI: RGB quando o terminal aceita, senão o ciano básico. */
function fg(p: Painter, rgb: Rgb, s: string): string {
  if (!p.color) return s;
  return p.truecolor ? `\x1b[38;2;${rgb.map(Math.round).join(";")}m${s}\x1b[39m` : `\x1b[36m${s}\x1b[39m`;
}
const style = (p: Painter, open: number, close: number) => (s: string) => (p.color ? `\x1b[${open}m${s}\x1b[${close}m` : s);

/** Texto com degradê letra a letra entre duas cores. */
function gradient(p: Painter, text: string, from: Rgb, to: Rgb): string {
  if (!p.truecolor) return fg(p, from, text);
  const chars = [...text];
  return chars.map((ch, i) => {
    const t = chars.length > 1 ? i / (chars.length - 1) : 0;
    return fg(p, [0, 1, 2].map((k) => from[k] + (to[k] - from[k]) * t) as Rgb, ch);
  }).join("");
}

/** Duas cores para o degradê: as da marca, ou a principal e um vizinho no círculo cromático. */
function palette(colors: Hsl[]): [Rgb, Rgb] {
  const vivid = colors.filter((c) => c.s >= 25 && c.l >= 25 && c.l <= 80);
  const a: Hsl = vivid[0] ?? { h: 258, s: 90, l: 66 };
  const b: Hsl = vivid[1] ?? { h: (a.h + 50) % 360, s: a.s, l: Math.min(72, a.l + 6) };
  return [hslToRgb(a.h, a.s, a.l) as Rgb, hslToRgb(b.h, b.s, b.l) as Rgb];
}

function ago(iso: string | undefined, lang: "pt" | "en"): string | undefined {
  const at = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(at)) return undefined;
  const min = Math.max(0, Math.round((Date.now() - at) / 60000));
  const [n, unit] = min < 60 ? [min, "min"] : min < 60 * 48 ? [Math.round(min / 60), "h"] : [Math.round(min / 1440), "d"];
  if (min < 1) return lang === "pt" ? "agora há pouco" : "just now";
  return lang === "pt" ? `há ${n} ${unit}` : `${n} ${unit} ago`;
}

const clip = (s: string, max: number) => ([...s].length > max ? `${[...s].slice(0, max - 1).join("").trimEnd()}…` : s);

/** Banner do `serve`: caixa com o projeto, o endereço, números do deck e os atalhos. */
export function serveBanner(info: BannerInfo, p: Painter = painter()): string {
  const pt = info.lang === "pt";
  const [from, to] = palette(info.colors);
  const bold = style(p, 1, 22);
  const dim = style(p, 2, 22);
  const green = style(p, 32, 39);
  const yellow = style(p, 33, 39);
  const accent = (s: string) => fg(p, from, s);

  const rows: string[] = [];
  rows.push(`${accent("◆")} ${bold(gradient(p, "onboarding-kit", from, to))}  ${dim(`v${info.version}`)}`);
  if (info.project?.name) {
    const room = Math.max(20, Math.min(56, (process.stdout.columns || 80) - 12) - [...info.project.name].length - 3);
    const tagline = info.project.tagline ? clip(info.project.tagline.replace(/\.$/, ""), room) : "";
    rows.push(`  ${bold(info.project.name)}${tagline ? dim(` — ${tagline}`) : ""}`);
  }
  rows.push("");

  const label = (s: string) => dim(s.padEnd(pt ? 10 : 9));
  rows.push(`${accent("➜")}  ${label("Local:")}${bold(fg(p, to, info.url))}`);
  if (info.tracks?.length) {
    const param = pt ? "trilha" : "track";
    rows.push(`${accent("➜")}  ${label(pt ? "Trilhas:" : "Tracks:")}${info.tracks.map((t) => `${dim(`/?${param}=`)}${t.id}`).join(dim(" · "))}`);
  }
  rows.push("");

  const dot = (ok: boolean) => (ok ? green("●") : yellow("●"));
  if (info.status === "filled") {
    const stats = [
      info.slides !== undefined ? `${bold(String(info.slides))} slides` : "",
      info.chapters !== undefined ? `${bold(String(info.chapters))} ${pt ? "capítulos" : "chapters"}` : "",
      info.coverage !== undefined ? `${pt ? "cobertura" : "coverage"} ${bold(`${info.coverage}%`)}` : "",
    ].filter(Boolean);
    rows.push(`${dot(true)} ${stats.join(dim("  ·  "))}`);
    const when = ago(info.generatedAt, info.lang);
    rows.push(`${dot(true)} ${info.file}${when ? dim(pt ? `  ·  gerado ${when}` : `  ·  generated ${when}`) : ""}`);
  } else if (info.status === "pending") {
    rows.push(`${dot(false)} ${pt ? "Esperando a IA preencher" : "Waiting for the AI to fill in"} ${bold(info.file)}`);
    rows.push(`  ${dim(pt ? "A página mostra o prompt e abre sozinha quando ela terminar." : "The page shows the prompt and opens by itself when it's done.")}`);
  } else if (info.status === "missing") {
    rows.push(`${dot(false)} ${pt ? "Ainda não existe" : "Not created yet:"} ${bold(info.file)}`);
    rows.push(`  ${dim(pt ? "Rode npx onboarding-kit init, ou abra a página para ver o prompt." : "Run npx onboarding-kit init, or open the page to see the prompt.")}`);
  } else {
    rows.push(`${yellow("●")} ${bold(info.file)} ${pt ? "não é um JSON válido" : "is not valid JSON"}`);
  }

  const width = Math.max(44, ...rows.map(visible)) + 4;
  const edge = (s: string) => fg(p, from, s);
  const pad = (s: string) => `${edge("│")}  ${s}${" ".repeat(width - 4 - visible(s))}  ${edge("│")}`;
  const keys: [string, string][] = pt
    ? [["← →", "navegar"], ["O", "índice"], ["Ctrl+K", "busca"], ["Ctrl+C", "sair"]]
    : [["← →", "navigate"], ["O", "index"], ["Ctrl+K", "search"], ["Ctrl+C", "quit"]];
  const ready = pt ? `pronto em ${Math.round(info.readyMs)} ms` : `ready in ${Math.round(info.readyMs)} ms`;

  return [
    "",
    `  ${edge(`╭${"─".repeat(width)}╮`)}`,
    `  ${pad("")}`,
    ...rows.map((r) => `  ${pad(r)}`),
    `  ${pad("")}`,
    `  ${edge(`╰${"─".repeat(width - ready.length - 3)}`)} ${dim(ready)} ${edge("─╯")}`,
    `   ${keys.map(([k, v]) => `${bold(k)} ${dim(v)}`).join(dim("   "))}`,
    "",
  ].join("\n");
}
