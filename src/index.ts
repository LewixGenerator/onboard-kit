import { dirname } from "node:path";
import { loadOnboarding } from "./load";
import { renderErrorPage, renderMissingPage, renderOnboarding } from "./render";

export * from "./types";
export { createTemplate, aiPrompt, SCHEMA_VERSION } from "./template";
export { loadOnboarding, resolveEnabled, resolveFile, isBlank, DEFAULT_FILE } from "./load";
export { validateOnboarding, parseEvidence } from "./validate";
export { resolveBrand, parseColor, toHex } from "./brand";
export { detectFramework, detectProject, FRAMEWORKS } from "./detect";
export type { ProjectProfile } from "./detect";
export type { Hsl, ResolvedBrand } from "./brand";
export type { Issue, ValidateOptions } from "./validate";
export { renderOnboarding, escapeHtml } from "./render";

export interface RenderedPage {
  status: number;
  html: string;
}

/** Lê o onboarding.json a cada chamada e devolve a página pronta (usado pelos adapters). */
export async function renderOnboardingPage(file?: string): Promise<RenderedPage> {
  const result = await loadOnboarding(file);
  const root = dirname(result.file);
  if (!result.ok) {
    return result.reason === "missing"
      ? { status: 200, html: renderMissingPage(root) }
      : { status: 500, html: renderErrorPage(result.message, root) };
  }
  try {
    return { status: 200, html: renderOnboarding(result.data, { root }) };
  } catch (err) {
    return { status: 500, html: renderErrorPage((err as Error).message, root) };
  }
}

export const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
} as const;
