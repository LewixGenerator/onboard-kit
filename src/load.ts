import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { OnboardingData, OnboardingOptions } from "./types";

export const DEFAULT_FILE = "onboarding.json";

export function resolveFile(file?: string): string {
  return resolve(process.cwd(), file ?? DEFAULT_FILE);
}

export function resolveEnabled(options: OnboardingOptions = {}): boolean {
  return options.enabled ?? process.env.NODE_ENV !== "production";
}

export type LoadResult =
  | { ok: true; file: string; data: OnboardingData }
  | { ok: false; file: string; reason: "missing" | "invalid-json"; message: string };

export async function loadOnboarding(file?: string): Promise<LoadResult> {
  const path = resolveFile(file);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return { ok: false, file: path, reason: "missing", message: `Arquivo não encontrado: ${path}` };
  }
  try {
    return { ok: true, file: path, data: JSON.parse(raw) as OnboardingData };
  } catch (err) {
    return {
      ok: false,
      file: path,
      reason: "invalid-json",
      message: `JSON inválido em ${path}: ${(err as Error).message}`,
    };
  }
}

/** true quando o valor não tem nenhum texto preenchido (strings vazias, arrays/objetos vazios). */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean" || typeof value === "number") return true;
  if (Array.isArray(value)) return value.every(isBlank);
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !key.startsWith("_"))
      .every(([, v]) => isBlank(v));
  }
  return true;
}

/** Remove itens-modelo em branco de um array. */
export function filled<T>(items: T[] | undefined | null): T[] {
  return Array.isArray(items) ? items.filter((item) => !isBlank(item)) : [];
}
