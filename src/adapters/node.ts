import type { IncomingMessage, ServerResponse } from "node:http";
import { handleOnboarding, nodeBody, nodeHeader } from "../handler";
import type { OnboardingOptions } from "../types";

export type { OnboardingOptions };

/**
 * Handler para Node.js puro, Express, Connect e similares (GET mostra a página; POST recebe o feedback).
 *
 * Express:  app.all("/onboarding", createOnboardingHandler());
 * Node:     http.createServer((req, res) => req.url?.startsWith("/onboarding") ? handler(req, res) : ...)
 */
export function createOnboardingHandler(options: OnboardingOptions = {}) {
  return async function onboardingHandler(req: IncomingMessage & { body?: unknown; originalUrl?: string }, res: ServerResponse, next?: (err?: unknown) => void): Promise<void> {
    try {
      const out = await handleOnboarding({ method: req.method, url: req.originalUrl ?? req.url, header: nodeHeader(req.headers), text: nodeBody(req) }, options);
      if (!out) {
        if (next) return next();
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }
      res.writeHead(out.status, out.headers);
      res.end(out.body);
    } catch (err) {
      if (next) return next(err);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    }
  };
}
