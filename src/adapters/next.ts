import { HTML_HEADERS, renderOnboardingPage } from "../index";
import { resolveEnabled } from "../load";
import type { OnboardingOptions } from "../types";

export type { OnboardingOptions };

/**
 * Route handler para o App Router do Next.js.
 *
 * app/onboarding/route.ts:
 *   import { createOnboardingRoute } from "onboard-kit/next";
 *   export const runtime = "nodejs";
 *   export const dynamic = "force-dynamic";
 *   export const GET = createOnboardingRoute();
 */
export function createOnboardingRoute(options: OnboardingOptions = {}) {
  return async function GET(): Promise<Response> {
    if (!resolveEnabled(options)) {
      return new Response("Not Found", { status: 404 });
    }
    const page = await renderOnboardingPage(options.file);
    return new Response(page.html, { status: page.status, headers: HTML_HEADERS });
  };
}

/**
 * Handler para o Pages Router (pages/api/onboarding.ts).
 * Para servir em /onboarding, adicione no next.config:
 *   async rewrites() { return [{ source: "/onboarding", destination: "/api/onboarding" }]; }
 */
export function createOnboardingApiHandler(options: OnboardingOptions = {}) {
  return async function handler(
    _req: unknown,
    res: { status(code: number): { send(body: string): void }; setHeader(name: string, value: string): void },
  ): Promise<void> {
    if (!resolveEnabled(options)) {
      res.status(404).send("Not Found");
      return;
    }
    const page = await renderOnboardingPage(options.file);
    for (const [name, value] of Object.entries(HTML_HEADERS)) res.setHeader(name, value);
    res.status(page.status).send(page.html);
  };
}
