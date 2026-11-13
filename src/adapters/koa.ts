import { handleOnboarding, nodeBody } from "../handler";
import type { OnboardingOptions } from "../types";

export interface OnboardingKoaOptions extends OnboardingOptions {
  /** Caminho da página. Padrão: "/onboarding". */
  path?: string;
}

interface ContextLike {
  method: string;
  path: string;
  url?: string;
  status: number;
  body: unknown;
  get?(name: string): string;
  set(headers: Record<string, string>): void;
  req?: { on?: Function };
  request?: { body?: unknown };
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
    if (ctx.path !== path || !["GET", "HEAD", "POST"].includes(ctx.method)) return next();
    const body = ctx.request?.body !== undefined ? { body: ctx.request.body } : (ctx.req ?? {});
    const out = await handleOnboarding({ method: ctx.method, url: ctx.url, header: (name) => ctx.get?.(name) || undefined, text: nodeBody(body) }, rest);
    if (!out) return next();
    ctx.status = out.status;
    ctx.set(out.headers);
    ctx.body = out.body;
  };
}
