import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve, sep } from "node:path";
import { isBlank } from "./load";
import type { OnboardingData } from "./types";

/** Cor em HSL: h 0–360, s e l 0–100. */
export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface ResolvedBrand {
  /** Cores da marca, a principal primeiro. */
  colors: Hsl[];
  /** Logo e favicon como data URI, prontos para <img>/<link>. */
  logo?: string;
  favicon?: string;
}

type Rgb = [number, number, number];

/* ───────────────────────── cores ───────────────────────── */

/** Tons 500 da paleta padrão do Tailwind, para configs como `primary: colors.indigo`. */
const TAILWIND_500: Record<string, string> = {
  slate: "#64748b", gray: "#6b7280", zinc: "#71717a", neutral: "#737373", stone: "#78716c",
  red: "#ef4444", orange: "#f97316", amber: "#f59e0b", yellow: "#eab308", lime: "#84cc16",
  green: "#22c55e", emerald: "#10b981", teal: "#14b8a6", cyan: "#06b6d4", sky: "#0ea5e9",
  blue: "#3b82f6", indigo: "#6366f1", violet: "#8b5cf6", purple: "#a855f7", fuchsia: "#d946ef",
  pink: "#ec4899", rose: "#f43f5e",
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function num(value: string, scale = 1): number {
  return value.endsWith("%") ? (parseFloat(value) / 100) * scale : parseFloat(value);
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  s = clamp01(s / 100);
  l = clamp01(l / 100);
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function oklchToRgb(L: number, C: number, H: number): Rgb {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.abs(x) ** (1 / 2.4) - 0.055;
    return clamp01(v) * 255;
  }) as Rgb;
}

function rgbToHsl([r, g, b]: Rgb): Hsl {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

/**
 * Lê uma cor CSS: #hex, rgb(), hsl(), oklch(), o trio "222 47% 11%" do shadcn/ui
 * ou um nome da paleta do Tailwind ("indigo", "indigo-600").
 */
export function parseColor(input: string): Hsl | undefined {
  const value = input.trim().toLowerCase().replace(/\s*!important$/, "");

  const hex = /^#([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) digits = [...digits.slice(0, 3)].map((d) => d + d).join("");
    if (digits.length !== 6 && digits.length !== 8) return undefined;
    return rgbToHsl([0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as Rgb);
  }

  const rgb = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/.exec(value);
  if (rgb) return rgbToHsl([num(rgb[1], 255), num(rgb[2], 255), num(rgb[3], 255)]);

  const hsl = /^(?:hsla?\(\s*)?([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(value);
  if (hsl) return rgbToHsl(hslToRgb(parseFloat(hsl[1]), parseFloat(hsl[2]), parseFloat(hsl[3])));

  const oklch = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(?:deg)?/.exec(value);
  if (oklch) return rgbToHsl(oklchToRgb(num(oklch[1]), num(oklch[2], 0.4), parseFloat(oklch[3])));

  const named = /^([a-z]+)(?:-\d{2,3})?$/.exec(value);
  if (named && TAILWIND_500[named[1]]) return parseColor(TAILWIND_500[named[1]]);

  return undefined;
}

export function toHex({ h, s, l }: Hsl): string {
  return `#${hslToRgb(h, s, l)
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Cor sem matiz perceptível (preto, branco, cinzas). */
export function isAchromatic(c: Hsl): boolean {
  return c.s < 12 || c.l < 6 || c.l > 96;
}

/** Remove cores praticamente iguais, mantendo a ordem. */
function dedupe(colors: Hsl[]): Hsl[] {
  const out: Hsl[] = [];
  for (const c of colors) {
    const same = out.some((o) => {
      if (isAchromatic(o) && isAchromatic(c)) return true;
      const dh = Math.min(Math.abs(o.h - c.h), 360 - Math.abs(o.h - c.h));
      return dh < 14 && Math.abs(o.s - c.s) < 30;
    });
    if (!same) out.push(c);
  }
  return out;
}

/* ───────────────────────── detecção ───────────────────────── */

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".output", ".svelte-kit", "coverage", ".turbo", ".vercel", ".cache", "vendor"]);
const STYLE_FILE = /(^tailwind\.config\.[cm]?[jt]s$)|(\.(css|scss|sass|less)$)|(^(theme|colors|tokens|palette|brand)\.[cm]?[jt]sx?$)|(^(manifest\.json|site\.webmanifest|manifest\.webmanifest)$)/i;
const MAX_FILES = 40;
const MAX_STYLE_BYTES = 300_000;

/** Peso do nome da variável: quanto menor, mais "cara da marca". */
const ROLE_WEIGHT: Record<string, number> = { brand: 0, primary: 1, theme_color: 1.5, themecolor: 1.5, accent: 2, secondary: 3 };

interface Candidate {
  color: Hsl;
  weight: number;
  order: number;
}

function listStyleFiles(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 4 || found.length >= MAX_FILES) return;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= MAX_FILES) return;
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith(".")) walk(join(dir, entry.name), depth + 1);
      } else if (STYLE_FILE.test(entry.name) && !entry.name.endsWith(".min.css")) {
        found.push(join(dir, entry.name));
      }
    }
  };
  walk(root, 0);
  // configs do Tailwind e manifestos primeiro: são as fontes mais confiáveis
  return found.sort((a, b) => Number(!/tailwind\.config|manifest/i.test(a)) - Number(!/tailwind\.config|manifest/i.test(b)));
}

/** Procura cores nomeadas como brand/primary/accent em CSS, SCSS, configs JS/TS e manifestos. */
export function extractColors(source: string): { role: string; value: string }[] {
  const found: { role: string; value: string; index: number }[] = [];
  const add = (role: string, value: string, index: number) => found.push({ role: role.toLowerCase(), value: value.trim(), index });
  const ROLE = "(brand|primary|accent|secondary)";
  const SHADE = "(?:[-_](?:color|default|main|base|500|600))?";

  // CSS: --primary, --color-brand-500 (Tailwind v4 @theme), --brand-color
  for (const m of source.matchAll(new RegExp(`--(?:color-)?${ROLE}${SHADE}\\s*:\\s*([^;}{]+)`, "gi"))) add(m[1], m[2], m.index ?? 0);
  // SCSS / LESS: $primary, @brand-color
  for (const m of source.matchAll(new RegExp(`[$@]${ROLE}${SHADE}\\s*:\\s*([^;\\n]+)`, "gi"))) add(m[1], m[2], m.index ?? 0);
  // JS/TS/JSON: primary: "#..." / "brand": "#..." / themeColor: "#..."
  for (const m of source.matchAll(/["']?(brand|primary|accent|secondary|theme_color|themeColor)["']?\s*:\s*(["'`])([^"'`\n]+)\2/gi)) add(m[1], m[3], m.index ?? 0);
  // JS/TS: primary: { DEFAULT: "#...", 500: "#..." } e MUI primary: { main: "#..." }
  for (const m of source.matchAll(new RegExp(`["']?${ROLE}["']?\\s*:\\s*\\{([^{}]*)\\}`, "gi"))) {
    const inner = /["']?(?:DEFAULT|main|500|600)["']?\s*:\s*(["'`])([^"'`\n]+)\1/i.exec(m[2]);
    if (inner) add(m[1], inner[2], m.index ?? 0);
  }
  // Tailwind: primary: colors.indigo
  for (const m of source.matchAll(new RegExp(`["']?${ROLE}["']?\\s*:\\s*colors\\.(\\w+)`, "gi"))) add(m[1], m[2], m.index ?? 0);

  return found.sort((a, b) => a.index - b.index).map(({ role, value }) => ({ role, value }));
}

export function detectColors(root: string): Hsl[] {
  const candidates: Candidate[] = [];
  let order = 0;
  for (const file of listStyleFiles(root)) {
    let source: string;
    try {
      if (statSync(file).size > MAX_STYLE_BYTES) continue;
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const { role, value } of extractColors(source)) {
      const color = parseColor(value);
      if (!color || color.l > 96) continue; // branco não serve como cor de destaque
      const weight = (ROLE_WEIGHT[role] ?? 4) + (isAchromatic(color) ? 2.5 : 0);
      candidates.push({ color, weight, order: order++ });
    }
  }
  candidates.sort((a, b) => a.weight - b.weight || a.order - b.order);
  return dedupe(candidates.map((c) => c.color)).slice(0, 5);
}

const IMAGE_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};
const IMAGE_DIRS = ["public", "public/images", "public/img", "public/assets", "public/static", "static", "assets", "src/assets", "src/assets/images", "app", "src/app"];
/** Arquivos que vêm nos templates do create-next-app, Vite etc. e não são a marca do projeto. */
const BOILERPLATE = /^(next|vercel|vite|react|file|globe|window|nuxt|svelte|angular|placeholder)\.(svg|png)$/i;
const MAX_IMAGE_BYTES = 400_000;

function imageScore(name: string, kind: "logo" | "favicon"): number | undefined {
  const base = name.toLowerCase();
  if (BOILERPLATE.test(base)) return undefined;
  const ext = extname(base);
  if (!IMAGE_TYPES[ext]) return undefined;
  const extRank = [".svg", ".png", ".webp", ".avif", ".ico", ".jpg", ".jpeg", ".gif"].indexOf(ext) / 10;
  const variant = /(white|light|inverse|negative|mono)/.test(base) ? 0.5 : 0;
  const rank =
    kind === "logo"
      ? /logo/.test(base) ? 0 : /brand|wordmark/.test(base) ? 0.5 : /mark|symbol/.test(base) ? 1 : /^(icon|apple-icon|apple-touch-icon)/.test(base) ? 2 : /^favicon/.test(base) ? 3 : undefined
      : /^favicon/.test(base) ? 0 : /^icon\./.test(base) ? 0.5 : /apple-(touch-)?icon/.test(base) ? 1 : /logo/.test(base) ? 2 : undefined;
  return rank === undefined ? undefined : rank + variant + extRank;
}

export function detectImage(root: string, kind: "logo" | "favicon"): string | undefined {
  let best: { path: string; score: number } | undefined;
  for (const dir of IMAGE_DIRS) {
    let names: string[];
    try {
      names = readdirSync(join(root, dir));
    } catch {
      continue;
    }
    for (const name of names) {
      const score = imageScore(name, kind);
      if (score === undefined || (best && best.score <= score)) continue;
      const path = `${dir}/${name}`;
      try {
        if (statSync(join(root, path)).isFile()) best = { path, score };
      } catch {
        // ignora
      }
    }
  }
  return best?.path;
}

/** Lê uma imagem do repositório como data URI, só se estiver dentro da raiz e for uma imagem pequena. */
export function imageDataUri(root: string, path: string): string | undefined {
  const full = resolve(root, path);
  const rel = relative(root, full);
  if (!rel || rel.startsWith("..") || rel.split(sep).includes("..")) return undefined;
  const type = IMAGE_TYPES[extname(full).toLowerCase()];
  if (!type || !existsSync(full)) return undefined;
  try {
    if (statSync(full).size > MAX_IMAGE_BYTES) return undefined;
    return `data:${type};base64,${readFileSync(full).toString("base64")}`;
  } catch {
    return undefined;
  }
}

/* ───────────────────────── resolução ───────────────────────── */

const cache = new Map<string, { at: number; colors: Hsl[]; logo?: string; favicon?: string }>();
const CACHE_MS = 5_000;

function detect(root: string) {
  const hit = cache.get(root);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  const value = { at: Date.now(), colors: detectColors(root), logo: detectImage(root, "logo"), favicon: detectImage(root, "favicon") };
  cache.set(root, value);
  return value;
}

/**
 * Junta o que a IA preencheu em `brand` com o que dá para detectar no repositório.
 * O JSON tem prioridade; a detecção cobre o que faltar. Sem `root`, usa só o JSON.
 */
export function resolveBrand(data: Partial<OnboardingData> | undefined, root?: string): ResolvedBrand {
  const b = data?.brand;
  const declared = dedupe(
    [b?.primaryColor, ...(Array.isArray(b?.palette) ? b.palette : [])]
      .filter((v): v is string => typeof v === "string" && !isBlank(v))
      .map(parseColor)
      .filter((c): c is Hsl => !!c),
  );
  const found = root ? detect(root) : undefined;
  const colors = declared.length ? dedupe([...declared, ...(declared.length < 2 ? found?.colors ?? [] : [])]).slice(0, 5) : found?.colors ?? [];

  const image = (declaredPath: string | undefined, detected: string | undefined) => {
    if (!root) return undefined;
    return (declaredPath && !isBlank(declaredPath) ? imageDataUri(root, declaredPath) : undefined) ?? (detected ? imageDataUri(root, detected) : undefined);
  };
  const logo = image(b?.logo, found?.logo);
  const favicon = image(b?.favicon, found?.favicon) ?? logo;
  return { colors, logo, favicon };
}

/** Nome do package.json da raiz, para identificar o projeto antes da IA preencher o onboarding. */
export function packageName(root?: string): string | undefined {
  if (!root) return undefined;
  try {
    const name = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).name;
    return typeof name === "string" && name.trim() ? name.trim() : undefined;
  } catch {
    return undefined;
  }
}
