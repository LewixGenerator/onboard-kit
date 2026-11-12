import type { IncomingMessage, ServerResponse } from "node:http";
import { HTML_HEADERS, renderOnboardingPage } from "../index";
import { resolveEnabled } from "../load";
import type { OnboardingOptions } from "../types";

export type { OnboardingOptions };

/**
 * Handler para Node.js puro, Express, Connect e similares.
 *
 * Express:  app.get("/onboarding", createOnboardingHandler());
 * Node:     http.createServer((req, res) => req.url === "/onboarding" ? handler(req, res) : ...)
 */
export function createOnboardingHandler(options: OnboardingOptions = {}) {
  return async function onboardingHandler(
    _req: IncomingMessage,
    res: ServerResponse,
    next?: (err?: unknown) => void,
  ): Promise<void> {
    if (!resolveEnabled(options)) {
      if (next) return next();
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    try {
      const page = await renderOnboardingPage(options.file);
      res.writeHead(page.status, HTML_HEADERS);
      res.end(page.html);
    } catch (err) {
      if (next) return next(err);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Internal Server Error");
    }
  };
}
