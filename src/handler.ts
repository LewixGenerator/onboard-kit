import { timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { HTML_HEADERS, renderOnboardingPage } from "./page";
import { loadOnboarding, resolveEnabled, resolvePassword } from "./load";
import type { OnboardingOptions } from "./types";

/** O que os adapters sabem da requisição, em qualquer framework. */
export interface CoreRequest {
  method?: string;
  /** URL ou caminho com a query (ex.: /onboarding?trilha=frontend). */
  url?: string;
  header(name: string): string | undefined;
  /** Corpo cru (só no POST de feedback). */
  text(): Promise<string>;
}

export interface CoreResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export const FEEDBACK_FILE = "onboarding-feedback.json";
const MAX_FEEDBACK = 500;

export interface FeedbackEntry {
  at: string;
  /** Âncora do slide (ex.: arquitetura/2). */
  slide: string;
  title: string;
  comment: string;
  /** meta.commit do onboarding que a pessoa estava lendo. */
  commit: string;
}

const text = (status: number, body: string, headers: Record<string, string> = {}): CoreResponse => ({
  status,
  headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...headers },
  body,
});
const json = (status: number, value: unknown): CoreResponse => ({
  status,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  body: JSON.stringify(value),
});

/** Basic Auth com qualquer usuário e a senha configurada. */
export function checkPassword(authorization: string | undefined, password: string): boolean {
  const m = /^Basic\s+(.+)$/i.exec(authorization ?? "");
  if (!m) return false;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const given = Buffer.from(decoded.slice(decoded.indexOf(":") + 1));
  const expected = Buffer.from(password);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function queryParam(url: string | undefined, ...names: string[]): string | undefined {
  const query = (url ?? "").split("?")[1];
  if (!query) return undefined;
  const params = new URLSearchParams(query);
  for (const name of names) {
    const v = params.get(name);
    if (v) return v;
  }
  return undefined;
}

export function readFeedback(file: string): FeedbackEntry[] {
  try {
    const list = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function saveFeedback(req: CoreRequest, options: OnboardingOptions): Promise<CoreResponse> {
  // só JSON: um formulário de outro site não consegue mandar application/json sem preflight
  if (!/application\/json/i.test(req.header("content-type") ?? "")) return text(415, "Use application/json");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return text(400, "JSON inválido");
  }
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : "";
  if (!comment) return text(400, "Comentário vazio");
  const loaded = await loadOnboarding(options.file);
  const file = join(dirname(loaded.file), FEEDBACK_FILE);
  const entries = readFeedback(file);
  entries.push({
    at: new Date().toISOString(),
    slide: String(body.slide ?? "").slice(0, 120),
    title: String(body.title ?? "").slice(0, 200),
    comment,
    commit: loaded.ok ? String(loaded.data.meta?.commit ?? "") : "",
  });
  writeFileSync(file, JSON.stringify(entries.slice(-MAX_FEEDBACK), null, 2) + "\n");
  return json(201, { ok: true });
}

/**
 * Atende /onboarding em qualquer adapter: senha, trilha (?trilha=), página e o POST de feedback.
 * Devolve undefined quando a rota está desligada (o adapter decide entre 404 e next()).
 */
export async function handleOnboarding(req: CoreRequest, options: OnboardingOptions = {}): Promise<CoreResponse | undefined> {
  if (!resolveEnabled(options)) return undefined;
  const password = resolvePassword(options);
  if (password && !checkPassword(req.header("authorization"), password)) {
    return text(401, "Senha necessária", { "WWW-Authenticate": 'Basic realm="onboarding", charset="UTF-8"' });
  }
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "POST") return options.feedback === false ? text(404, "Not Found") : saveFeedback(req, options);
  if (method !== "GET" && method !== "HEAD") return text(405, "Method Not Allowed", { Allow: "GET, POST" });
  const page = await renderOnboardingPage(options.file, { track: queryParam(req.url, "trilha", "track", "pista"), lang: queryParam(req.url, "lang", "idioma"), feedback: options.feedback !== false });
  return { status: page.status, headers: { ...HTML_HEADERS }, body: method === "HEAD" ? "" : page.html };
}

/** Cabeçalhos de um objeto do Node (IncomingMessage.headers). */
export function nodeHeader(headers: Record<string, string | string[] | undefined> | undefined) {
  return (name: string) => {
    const v = headers?.[name.toLowerCase()];
    return Array.isArray(v) ? v[0] : v;
  };
}

/** Lê o corpo de um stream do Node, ou usa o que um body parser já leu. */
export function nodeBody(req: { body?: unknown; on?: Function }): () => Promise<string> {
  return () => {
    if (req.body !== undefined) return Promise.resolve(typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    if (!req.on) return Promise.resolve("");
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on!("data", (c: Buffer) => chunks.push(c));
      req.on!("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on!("error", reject);
    });
  };
}

