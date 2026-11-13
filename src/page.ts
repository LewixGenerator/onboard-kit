import { dirname } from "node:path";
import { loadOnboarding } from "./load";
import { renderErrorPage, renderMissingPage, renderOnboarding } from "./render";

export interface RenderedPage {
  status: number;
  html: string;
}

export interface PageOptions {
  /** Trilha escolhida (?trilha=frontend). */
  track?: string;
  /** Mostra o botão de feedback por slide (só quando há servidor para receber). */
  feedback?: boolean;
}

/** Lê o onboarding.json a cada chamada e devolve a página pronta (usado pelos adapters). */
export async function renderOnboardingPage(file?: string, page: PageOptions = {}): Promise<RenderedPage> {
  const result = await loadOnboarding(file);
  const root = dirname(result.file);
  if (!result.ok) {
    return result.reason === "missing"
      ? { status: 200, html: renderMissingPage(root) }
      : { status: 500, html: renderErrorPage(result.message, root) };
  }
  try {
    return { status: 200, html: renderOnboarding(result.data, { root, file: result.file, ...page }) };
  } catch (err) {
    return { status: 500, html: renderErrorPage((err as Error).message, root) };
  }
}

export const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
} as const;
