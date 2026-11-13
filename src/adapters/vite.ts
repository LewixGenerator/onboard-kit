import type { IncomingMessage, ServerResponse } from "node:http";
import type { OnboardingOptions } from "../types";
import { createOnboardingHandler } from "./node";

export interface OnboardingViteOptions extends Pick<OnboardingOptions, "file" | "password" | "feedback"> {
  /** Caminho da página. Padrão: "/onboarding". */
  path?: string;
}

type Next = (err?: unknown) => void;

interface DevServerLike {
  config?: { base?: string };
  middlewares: { use(fn: (req: IncomingMessage, res: ServerResponse, next: Next) => void): void };
}

/**
 * Plugin do Vite: serve /onboarding no servidor de desenvolvimento (só em `vite dev`, nunca no build).
 * Funciona em qualquer projeto com Vite: React, Vue, Svelte, Solid, Preact, Qwik, Lit,
 * React Router/Remix, Astro (em vite.plugins) e afins.
 *
 * vite.config.ts:
 *   import { onboarding } from "onboarding-kit/vite";
 *   export default defineConfig({ plugins: [onboarding(), react()] });
 */
export function onboarding(options: OnboardingViteOptions = {}) {
  const path = options.path ?? "/onboarding";
  const handler = createOnboardingHandler({ file: options.file, password: options.password, feedback: options.feedback, enabled: true });
  return {
    name: "onboarding-kit",
    apply: "serve" as const,
    configureServer(server: DevServerLike) {
      const base = (server.config?.base ?? "/").replace(/\/$/, "");
      const paths = new Set([path, `${base}${path}`]);
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? "/").split("?")[0].replace(/\/$/, "");
        if ((req.method === "GET" || req.method === "POST") && paths.has(pathname)) return void handler(req, res, next);
        next();
      });
    },
  };
}
