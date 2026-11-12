import { HTML_HEADERS, renderOnboardingPage } from "../index";
import { resolveEnabled } from "../load";
import type { OnboardingOptions } from "../types";

export type { OnboardingOptions };

/**
 * Handler no padrão Web Fetch (Request → Response). Serve para qualquer runtime ou framework
 * que entenda Response: Hono, Elysia, SvelteKit, Remix/React Router, Astro, Nuxt/h3, Bun.serve, Deno.serve.
 *
 * Hono:      app.get("/onboarding", () => onboarding());
 * SvelteKit: src/routes/onboarding/+server.ts → export const GET = createOnboardingFetchHandler();
 * Nuxt:      server/routes/onboarding.get.ts → export default defineEventHandler(() => onboarding());
 */
export function createOnboardingFetchHandler(options: OnboardingOptions = {}) {
  return async function onboarding(_request?: unknown): Promise<Response> {
    if (!resolveEnabled(options)) {
      return new Response("Not Found", { status: 404 });
    }
    const page = await renderOnboardingPage(options.file);
    return new Response(page.html, { status: page.status, headers: HTML_HEADERS });
  };
}
