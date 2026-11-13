import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const START = "<!-- onboarding-kit:start -->";
const END = "<!-- onboarding-kit:end -->";

/** Trecho para AGENTS.md / CLAUDE.md: quando e como a IA atualiza o onboarding. */
export function agentsBlock(file = "onboarding.json"): string {
  return `${START}
## Onboarding do projeto (onboarding-kit)

O \`${file}\` explica este repositório para quem está chegando e aparece em \`/onboarding\`. Mantenha-o em dia:

- Depois de mudanças em regras de negócio, arquitetura, setup, comandos, variáveis de ambiente ou no fluxo de trabalho, rode \`npx onboarding-kit status\`.
- Se ele listar itens desatualizados, siga o prompt que ele mostra: revise só esses itens, mantenha o resto e atualize \`meta.commit\` e \`meta.generatedAt\`.
- \`npx onboarding-kit status --fix\` corrige sozinho as evidências que só mudaram de linha ou de arquivo.
- No fim, rode \`npx onboarding-kit validate\` e corrija o que ele apontar.
- Nunca copie segredos (valores de .env, tokens, senhas) para o arquivo.
- Se houver tradução (ex.: \`onboarding.en.json\`), rode depois \`npx onboarding-kit translate --to en\` e traduza só o que ele listar.
- Se o servidor MCP \`onboarding-kit\` estiver configurado, prefira as ferramentas \`onboarding_status\`, \`onboarding_fix_evidence\` e \`onboarding_validate\` aos comandos acima.
${END}`;
}

/** Slash command do Claude Code (/onboarding). */
export function claudeCommand(file = "onboarding.json"): string {
  return `---
description: Cria ou atualiza o ${file} com o que mudou no código
---

Mantenha o onboarding deste repositório em dia.

1. Se o ${file} não existir, rode \`npx onboarding-kit init\`.
2. Se \`meta.status\` for "pending", preencha o arquivo do zero seguindo \`_instructions\`.
3. Senão, rode \`npx onboarding-kit status --fix\` e siga o prompt que ele mostrar: revise só os itens listados, mantenha o resto e atualize \`meta.commit\` e \`meta.generatedAt\`.
4. Rode \`npx onboarding-kit validate\` e corrija tudo o que ele apontar.

$ARGUMENTS
`;
}

/** Regra do Cursor (.cursor/rules/onboarding.mdc). */
export function cursorRule(file = "onboarding.json"): string {
  return `---
description: Manter o ${file} (onboarding-kit) em dia
alwaysApply: false
---

${agentsBlock(file).replace(`${START}\n`, "").replace(`\n${END}`, "")}
`;
}

/** Insere ou troca o bloco entre os marcadores, preservando o resto do arquivo. */
export function upsertBlock(source: string, block: string): string {
  const start = source.indexOf(START);
  const end = source.indexOf(END);
  if (start >= 0 && end > start) return source.slice(0, start) + block + source.slice(end + END.length);
  return source.trim() ? `${source.replace(/\s*$/, "")}\n\n${block}\n` : `${block}\n`;
}

export interface AgentFileResult {
  file: string;
  action: "created" | "updated" | "unchanged";
}

/**
 * Ensina as IAs do projeto a manter o onboarding: AGENTS.md (sempre), CLAUDE.md e
 * .github/copilot-instructions.md (se existirem), /onboarding do Claude Code e a regra do Cursor (se .cursor existir).
 */
export function setupAgents(root: string, file = "onboarding.json"): AgentFileResult[] {
  const results: AgentFileResult[] = [];
  const write = (rel: string, next: (current: string) => string) => {
    const path = join(root, rel);
    const current = existsSync(path) ? readFileSync(path, "utf8") : undefined;
    const content = next(current ?? "");
    if (content === current) return results.push({ file: rel, action: "unchanged" });
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    results.push({ file: rel, action: current === undefined ? "created" : "updated" });
  };
  const block = agentsBlock(file);
  write("AGENTS.md", (s) => upsertBlock(s, block));
  for (const rel of ["CLAUDE.md", ".github/copilot-instructions.md"]) if (existsSync(join(root, rel))) write(rel, (s) => upsertBlock(s, block));
  write(".claude/commands/onboarding.md", () => claudeCommand(file));
  if (existsSync(join(root, ".cursor"))) write(".cursor/rules/onboarding.mdc", () => cursorRule(file));
  return results;
}
