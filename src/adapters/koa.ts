import { HTML_HEADERS, renderOnboardingPage } from "../index";
import { resolveEnabled } from "../load";
import type { OnboardingOptions } from "../types";

export interface OnboardingKoaOptions extends OnboardingOptions {
  /** Caminho da página. Padrão: "/onboarding". */
  path?: string;
}

interface ContextLike {
  method: string;
  path: string;
  status: number;
  body: unknown;
  set(headers: Record<string, string>): void;
}

/**
 * Middleware do Koa.
 *
 *   import { createOnboardingMiddleware } from "onboarding-kit/koa";
 *   app.use(createOnboardingMiddleware());
 */
export function createOnboardingMiddleware(options: OnboardingKoaOptions = {}) {
  const { path = "/onboarding", ...rest } = options;
  return async function onboarding(ctx: ContextLike, next: () => Promise<unknown>): Promise<unknown> {
    if (ctx.method !== "GET" || ctx.path !== path || !resolveEnabled(rest)) return next();
    const page = await renderOnboardingPage(rest.file);
    ctx.status = page.status;
    ctx.set({ ...HTML_HEADERS });
    ctx.body = page.html;
  };
}
