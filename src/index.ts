import { loadOnboarding } from "./load";
import { renderErrorPage, renderMissingPage, renderOnboarding } from "./render";

export * from "./types";
export { createTemplate, aiPrompt, SCHEMA_VERSION } from "./template";
export { loadOnboarding, resolveEnabled, resolveFile, isBlank, DEFAULT_FILE } from "./load";
export { validateOnboarding, parseEvidence } from "./validate";
export type { Issue, ValidateOptions } from "./validate";
export { renderOnboarding, escapeHtml } from "./render";

export interface RenderedPage {
  status: number;
  html: string;
}

/** Lê o onboarding.json a cada chamada e devolve a página pronta (usado pelos adapters). */
export async function renderOnboardingPage(file?: string): Promise<RenderedPage> {
  const result = await loadOnboarding(file);
  if (!result.ok) {
    return result.reason === "missing"
      ? { status: 200, html: renderMissingPage() }
      : { status: 500, html: renderErrorPage(result.message) };
  }
  try {
    return { status: 200, html: renderOnboarding(result.data) };
  } catch (err) {
    return { status: 500, html: renderErrorPage((err as Error).message) };
  }
}

export const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
} as const;
