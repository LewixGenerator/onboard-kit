import { handleOnboarding } from "../handler";
import type { OnboardingOptions } from "../types";

export type { OnboardingOptions };

/** Request do padrão Fetch, ou um contexto que o carrega (SvelteKit, Remix, Elysia: { request }). */
type RequestInput = Request | { request: Request } | undefined;

/**
 * Handler no padrão Web Fetch (Request → Response). Serve para qualquer runtime ou framework
 * que entenda Response: Hono, Elysia, SvelteKit, Remix/React Router, Astro, Nuxt/h3, Bun.serve, Deno.serve.
 * Use para GET (a página) e POST (o feedback dos slides).
 *
 * Hono:      app.all("/onboarding", (c) => onboarding(c.req.raw));
 * SvelteKit: src/routes/onboarding/+server.ts → export const GET = createOnboardingFetchHandler(); export const POST = GET;
 * Nuxt:      server/routes/onboarding.ts → export default defineEventHandler((event) => onboarding(toWebRequest(event)));
 */
export function createOnboardingFetchHandler(options: OnboardingOptions = {}) {
  return async function onboarding(input?: RequestInput): Promise<Response> {
    const request = input && "request" in input && !(input instanceof Request) ? input.request : (input as Request | undefined);
    const out = await handleOnboarding(
      {
        method: request?.method ?? "GET",
        url: request?.url,
        header: (name) => request?.headers.get(name) ?? undefined,
        text: () => request?.text() ?? Promise.resolve(""),
      },
      options,
    );
    if (!out) return new Response("Not Found", { status: 404 });
    return new Response(out.body || null, { status: out.status, headers: out.headers });
  };
}
