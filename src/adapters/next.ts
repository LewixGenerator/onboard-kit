import { handleOnboarding, nodeBody, nodeHeader } from "../handler";
import type { OnboardingOptions } from "../types";
import { createOnboardingFetchHandler } from "./fetch";

export type { OnboardingOptions };

/**
 * Route handler para o App Router do Next.js.
 *
 * app/onboarding/route.ts:
 *   import { createOnboardingRoute } from "onboarding-kit/next";
 *   export const runtime = "nodejs";
 *   export const dynamic = "force-dynamic";
 *   export const GET = createOnboardingRoute();
 *   export const POST = GET;
 */
export function createOnboardingRoute(options: OnboardingOptions = {}) {
  const onboarding = createOnboardingFetchHandler(options);
  return async function GET(request?: Request): Promise<Response> {
    return onboarding(request);
  };
}

interface ApiRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/**
 * Handler para o Pages Router (pages/api/onboarding.ts).
 * Para servir em /onboarding, adicione no next.config:
 *   async rewrites() { return [{ source: "/onboarding", destination: "/api/onboarding" }]; }
 */
export function createOnboardingApiHandler(options: OnboardingOptions = {}) {
  return async function handler(
    req: ApiRequest,
    res: { status(code: number): { send(body: string): void }; setHeader(name: string, value: string): void },
  ): Promise<void> {
    const out = await handleOnboarding({ method: req?.method, url: req?.url, header: nodeHeader(req?.headers), text: nodeBody(req ?? {}) }, options);
    if (!out) {
      res.status(404).send("Not Found");
      return;
    }
    for (const [name, value] of Object.entries(out.headers)) res.setHeader(name, value);
    res.status(out.status).send(out.body);
  };
}
