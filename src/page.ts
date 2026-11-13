import { dirname } from "node:path";
import { loadOnboarding } from "./load";
import { renderErrorPage, renderMissingPage, renderOnboarding } from "./render";
import { localize } from "./translate";

export interface RenderedPage {
  status: number;
  html: string;
}

export interface PageOptions {
  /** Trilha escolhida (?trilha=frontend). */
  track?: string;
  /** Idioma pedido (?lang=en). Sem tradução, a interface muda e o conteúdo fica no original. */
  lang?: string;
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
    if (result.data.meta?.status !== "filled") return { status: 200, html: renderOnboarding(result.data, { root, file: result.file, ...page }) };
    const view = localize(result.data, result.file, page.lang);
    const languages = { current: view.current, source: view.source, untranslated: view.untranslated, list: view.languages };
    return { status: 200, html: renderOnboarding(view.data, { root, file: result.file, ...page, languages, original: result.data }) };
  } catch (err) {
    return { status: 500, html: renderErrorPage((err as Error).message, root) };
  }
}

export const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
} as const;
