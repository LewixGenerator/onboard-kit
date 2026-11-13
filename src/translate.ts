import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { CONTENT_LANG, parseLang, type Lang } from "./i18n";
import type { OnboardingData } from "./types";

/**
 * Tradução incremental do conteúdo. A IA não relê o repositório: recebe só os textos que mudaram
 * desde a última tradução, num arquivo de trabalho pequeno, e devolve o mesmo arquivo traduzido.
 *
 *   onboarding.json            original (meta.language)
 *   onboarding.en.json         traduções já feitas, com o hash do texto original de cada uma
 *   onboarding.en.todo.json    o que falta traduzir (só existe enquanto houver pendências)
 */

export interface Translation {
  language: string;
  /** Idioma do onboarding.json quando a tradução foi feita. */
  source: string;
  /** Caminho no JSON (ex.: features[2].description) → hash do original e texto traduzido. */
  strings: Record<string, { h: string; t: string }>;
}

/** Chaves que nunca se traduzem: caminhos, código, comandos, nomes próprios e identificadores. */
const KEEP = new Set([
  "evidence", "entryPoints", "files", "file", "path", "paths", "command", "example", "examples", "pattern", "format",
  "dependsOn", "framework", "id", "chapters", "contact", "version", "repoUrl", "diagram", "mainBranch", "kind",
  "primaryColor", "palette", "logo", "favicon", "location", "enforcedBy",
]);
/** Nomes que são identificadores de verdade (pacote, script, variável, pessoa). */
const KEEP_NAME_IN = new Set(["stack", "gettingStarted.commands", "gettingStarted.envVars", "subprojects", "people"]);

const looksLikeCode = (s: string) => !/\s/.test(s.trim()) && /[/.:_()=<>{}[\]@#$`]|^[a-z]+[A-Z]/.test(s.trim());

const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 10);

/** Todos os textos traduzíveis do onboarding, por caminho. */
export function translatableStrings(data: OnboardingData): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (value: unknown, path: string, section: string, key: string) => {
    if (typeof value === "string") {
      const text = value.trim();
      if (text && !looksLikeCode(text) && !/^https?:\/\//.test(text)) out[path] = value;
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`, section, key));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith("_") || k.startsWith("$") || KEEP.has(k)) continue;
      if (k === "name" && KEEP_NAME_IN.has(section)) continue;
      walk(v, path ? `${path}.${k}` : k, section || k, k);
    }
  };
  for (const [section, value] of Object.entries(data)) {
    if (section === "meta" || section === "brand" || section.startsWith("_") || section.startsWith("$")) continue;
    if (section === "project") {
      for (const k of ["tagline", "purpose", "audience", "status"] as const) walk(data.project?.[k], `project.${k}`, "project", k);
      continue;
    }
    if (section === "gettingStarted" && value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, `gettingStarted.${k}`, `gettingStarted.${k}`, k);
      continue;
    }
    walk(value, section, section, section);
  }
  return out;
}

/** Arquivo da tradução: onboarding.json → onboarding.en.json. */
export function translationFile(file: string, lang: Lang): string {
  const ext = extname(file) || ".json";
  return join(dirname(file), `${basename(file, ext)}.${lang}${ext}`);
}
export const todoFile = (file: string, lang: Lang) => translationFile(file, lang).replace(/\.json$/, ".todo.json");

export function readTranslation(file: string, lang: Lang): Translation | undefined {
  try {
    const t = JSON.parse(readFileSync(translationFile(file, lang), "utf8"));
    return t && typeof t.strings === "object" ? t : undefined;
  } catch {
    return undefined;
  }
}

/** Textos novos ou alterados desde a última tradução. */
export function pendingStrings(data: OnboardingData, translation: Translation | undefined): Record<string, string> {
  const pending: Record<string, string> = {};
  for (const [path, text] of Object.entries(translatableStrings(data))) {
    if (translation?.strings[path]?.h !== hash(text)) pending[path] = text;
  }
  return pending;
}

export interface TodoFile {
  _instructions: string;
  /** Quando o arquivo foi criado: se ele mudar depois disso, a IA já traduziu. */
  _createdAt: string;
  strings: Record<string, string>;
}

export function todoInstructions(lang: Lang): string {
  return lang === "en"
    ? 'Translate each value in "strings" to English, in place. Keep the keys. Keep code in backticks, file paths, commands, URLs and product names as they are. Keep the tone short and friendly, like a slide. Do not read other files.'
    : 'Traduza cada valor de "strings" para o português do Brasil, no próprio arquivo. Mantenha as chaves. Mantenha como estão o código entre crases, caminhos, comandos, URLs e nomes de produtos. Tom curto e amigável, de slide. Não leia outros arquivos.';
}

/**
 * Junta o arquivo de trabalho às traduções. Considera traduzido o que a IA mexeu: valores diferentes do
 * original, ou todos se o arquivo foi salvo depois de criado (textos iguais nos dois idiomas, como "MVP").
 */
export function mergeTodo(data: OnboardingData, translation: Translation | undefined, lang: Lang, todoPath: string): { translation: Translation; merged: number } {
  const next: Translation = { language: CONTENT_LANG[lang], source: data.meta?.language || "pt-BR", strings: { ...(translation?.strings ?? {}) } };
  const current = translatableStrings(data);
  let merged = 0;
  let todo: TodoFile | undefined;
  try {
    todo = JSON.parse(readFileSync(todoPath, "utf8"));
  } catch {
    todo = undefined;
  }
  if (todo?.strings) {
    const touched = statSync(todoPath).mtimeMs > Date.parse(todo._createdAt) + 1000;
    for (const [path, text] of Object.entries(todo.strings)) {
      const source = current[path];
      if (source === undefined || typeof text !== "string" || !text.trim()) continue;
      if (text === source && !touched) continue;
      next.strings[path] = { h: hash(source), t: text };
      merged++;
    }
  }
  // tira o que não existe mais no original
  for (const path of Object.keys(next.strings)) if (!(path in current)) delete next.strings[path];
  return { translation: next, merged };
}

/** Guarda traduções vindas direto da IA (ferramenta MCP), sem arquivo de trabalho. */
export function addTranslations(data: OnboardingData, translation: Translation | undefined, lang: Lang, texts: Record<string, unknown>): { translation: Translation; added: number } {
  const next: Translation = { language: CONTENT_LANG[lang], source: data.meta?.language || "pt-BR", strings: { ...(translation?.strings ?? {}) } };
  const current = translatableStrings(data);
  let added = 0;
  for (const [path, text] of Object.entries(texts)) {
    if (current[path] === undefined || typeof text !== "string" || !text.trim()) continue;
    next.strings[path] = { h: hash(current[path]), t: text };
    added++;
  }
  return { translation: next, added };
}

function setPath(target: unknown, path: string, value: string): void {
  const keys = path.match(/[^.[\]]+/g) ?? [];
  let node = target as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    if (!node || typeof node !== "object") return;
    node = node[key] as Record<string, unknown>;
  }
  if (node && typeof node === "object") node[keys[keys.length - 1]] = value;
}

export interface LocalizedView {
  data: OnboardingData;
  /** Idioma do conteúdo original. */
  source: Lang;
  /** Idioma em que a página vai aparecer. */
  current: Lang;
  /** Pediu outro idioma e ainda não há tradução completa. */
  untranslated: number;
  /** Idiomas disponíveis no seletor. */
  languages: Lang[];
}

/** O onboarding no idioma pedido: aplica a tradução sobre o original; o que faltar fica no original. */
export function localize(data: OnboardingData, file: string | undefined, requested?: string): LocalizedView {
  const source = parseLang(data.meta?.language) ?? "pt";
  const current = parseLang(requested) ?? source;
  const languages: Lang[] = ["pt", "en"];
  if (current === source) return { data, source, current, untranslated: 0, languages };
  const translation = file && existsSync(translationFile(file, current)) ? readTranslation(file, current) : undefined;
  const view = JSON.parse(JSON.stringify(data)) as OnboardingData;
  let untranslated = 0;
  for (const [path, text] of Object.entries(translatableStrings(data))) {
    const hit = translation?.strings[path];
    if (hit && hit.h === hash(text)) setPath(view, path, hit.t);
    else untranslated++;
  }
  view.meta = { ...view.meta, language: CONTENT_LANG[current] };
  return { data: view, source, current, untranslated, languages };
}
