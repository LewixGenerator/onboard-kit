import { HTML_HEADERS, renderOnboardingPage } from "../index";
import { resolveEnabled } from "../load";
import type { OnboardingOptions } from "../types";

export interface OnboardingFastifyOptions extends OnboardingOptions {
  /** Caminho da rota. Padrão: "/onboarding". O prefix do register, se houver, é aplicado antes. */
  path?: string;
}

interface ReplyLike {
  code(status: number): ReplyLike;
  headers(values: Record<string, string>): ReplyLike;
  send(body: string): unknown;
}

/** Handler de rota do Fastify: app.get("/onboarding", createOnboardingFastifyHandler()). */
export function createOnboardingFastifyHandler(options: OnboardingOptions = {}) {
  return async function onboarding(_request: unknown, reply: ReplyLike) {
    if (!resolveEnabled(options)) return reply.code(404).send("Not Found");
    const page = await renderOnboardingPage(options.file);
    return reply.code(page.status).headers({ ...HTML_HEADERS }).send(page.html);
  };
}

/**
 * Plugin do Fastify.
 *
 *   import { fastifyOnboarding } from "onboarding-kit/fastify";
 *   app.register(fastifyOnboarding);
 */
export function fastifyOnboarding(
  fastify: { get(path: string, handler: ReturnType<typeof createOnboardingFastifyHandler>): unknown },
  options: OnboardingFastifyOptions,
  done: (err?: Error) => void,
): void {
  const { path = "/onboarding", ...rest } = options ?? {};
  fastify.get(path, createOnboardingFastifyHandler(rest));
  done();
}
