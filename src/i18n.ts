/** Idioma das mensagens da CLI: ONBOARDING_KIT_LANG, depois o locale do sistema. Português só quando o sistema está em português. */
export function cliLang(): "pt" | "en" {
  let locale = process.env.ONBOARDING_KIT_LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  if (!locale || locale === "C" || locale.startsWith("C.")) {
    try {
      locale = Intl.DateTimeFormat().resolvedOptions().locale; // Windows não tem LANG
    } catch {
      locale = "";
    }
  }
  return locale.toLowerCase().startsWith("pt") ? "pt" : "en";
}

/** Escolhe a mensagem no idioma da CLI. */
export const tr = (pt: string, en: string): string => (cliLang() === "pt" ? pt : en);
