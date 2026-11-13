import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Versão do pacote instalado (lida do package.json ao lado de dist/). */
export const VERSION: string = (() => {
  try {
    return JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8")).version;
  } catch {
    return "latest";
  }
})();

export const SCHEMA_URL = `https://unpkg.com/onboarding-kit@${VERSION}/dist/onboarding.schema.json`;
