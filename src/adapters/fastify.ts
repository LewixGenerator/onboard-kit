import { handleOnboarding, nodeBody, nodeHeader } from "../handler";
import type { OnboardingOptions } from "../types";

export interface OnboardingFastifyOptions extends OnboardingOptions {
  /** Caminho da rota. Padrão: "/onboarding". O prefix do register, se houver, é aplicado antes. */
  path?: string;
}

interface RequestLike {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ReplyLike {
  code(status: number): ReplyLike;
  headers(values: Record<string, string>): ReplyLike;
  send(body: string): unknown;
}

/** Handler de rota do Fastify: app.route({ method: ["GET", "POST"], url: "/onboarding", handler: createOnboardingFastifyHandler() }). */
export function createOnboardingFastifyHandler(options: OnboardingOptions = {}) {
  return async function onboarding(request: RequestLike | undefined, reply: ReplyLike) {
    const out = await handleOnboarding({ method: request?.method, url: request?.url, header: nodeHeader(request?.headers), text: nodeBody(request ?? {}) }, options);
    if (!out) return reply.code(404).send("Not Found");
    return reply.code(out.status).headers(out.headers).send(out.body);
  };
}

type Handler = ReturnType<typeof createOnboardingFastifyHandler>;

/**
 * Plugin do Fastify.
 *
 *   import { fastifyOnboarding } from "onboarding-kit/fastify";
 *   app.register(fastifyOnboarding);
 */
export function fastifyOnboarding(
  fastify: { get(path: string, handler: Handler): unknown; post?(path: string, handler: Handler): unknown },
  options: OnboardingFastifyOptions,
  done: (err?: Error) => void,
): void {
  const { path = "/onboarding", ...rest } = options ?? {};
  const handler = createOnboardingFastifyHandler(rest);
  fastify.get(path, handler);
  fastify.post?.(path, handler);
  done();
}
