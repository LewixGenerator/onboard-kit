import { filled } from "../load";
import type { Evidence, OnboardingData } from "../types";
import { parseEvidence } from "../validate";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texto escapado com quebras de linha e `código` inline. */
export function text(value: unknown): string {
  return escapeHtml(value)
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

export function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

/** Matiz estável (0–359) derivado de um texto, para avatares e logos. */
export function hueFrom(value: string): number {
  let hash = 0;
  for (const ch of value) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function initials(value: string): string {
  const words = value.replace(/[^\p{L}\p{N}\s.-]/gu, " ").trim().split(/[\s.-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function repoBase(data: OnboardingData): string | undefined {
  const url = data.project?.repoUrl?.trim();
  if (!url || !/^https?:\/\//.test(url)) return undefined;
  return url.replace(/\.git$/, "").replace(/\/$/, "");
}

const FILE_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true" width="12" height="12"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M4 1.75h5.25L12.5 5v9.25H4z M9 1.75V5.25h3.5"/></svg>';

export function evidenceChip(ref: Evidence, data: OnboardingData, extraClass = ""): string {
  const { file, line } = parseEvidence(ref);
  const label = `${FILE_ICON}<span>${escapeHtml(ref)}</span>`;
  const base = repoBase(data);
  if (!base) return `<span class="ev ${extraClass}">${label}</span>`;
  const commit = data.meta?.commit?.trim() || "HEAD";
  const href = `${base}/blob/${encodeURIComponent(commit)}/${file.split("/").map(encodeURIComponent).join("/")}${line ? `#L${line}` : ""}`;
  return `<a class="ev ${extraClass}" href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}</a>`;
}

export function evidenceList(refs: Evidence[] | undefined, data: OnboardingData): string {
  const list = filled(refs);
  if (list.length === 0) return "";
  return `<div class="evidence">${list.map((ref) => evidenceChip(ref, data)).join("")}</div>`;
}
