/** Idiomas da CLI e do conteúdo gerado. Português é o padrão. */
export type Lang = "pt" | "en";

/** "en", "en-US", "english" → en; o resto → pt. */
export function parseLang(value: string | undefined): Lang | undefined {
  if (!value?.trim()) return undefined;
  return /^en/i.test(value.trim()) ? "en" : "pt";
}

/** Idioma das mensagens da CLI: ONBOARDING_KIT_LANG=en para inglês; o padrão é português. */
export function cliLang(): Lang {
  return parseLang(process.env.ONBOARDING_KIT_LANG) ?? "pt";
}

/** Escolhe a mensagem no idioma da CLI. */
export const tr = (pt: string, en: string): string => (cliLang() === "pt" ? pt : en);

/** Código de idioma do conteúdo (meta.language) para cada idioma. */
export const CONTENT_LANG: Record<Lang, string> = { pt: "pt-BR", en: "en" };
