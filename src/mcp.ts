import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { createInterface } from "node:readline";
import { detectFramework, detectSubprojects, readProjectManifests } from "./detect";
import { collectFacts } from "./facts";
import { resolveFile } from "./load";
import { applyDrift, onboardingStatus, statusPrompt } from "./status";
import { createTemplate } from "./template";
import type { OnboardingData } from "./types";
import { coverageScore, validateOnboarding } from "./validate";
import { VERSION } from "./version";
import { parseLang } from "./i18n";
import { addTranslations, pendingStrings, readTranslation, todoInstructions, translationFile } from "./translate";

/**
 * Servidor MCP (stdio) do onboarding-kit: a IA chama facts, status e validate como ferramentas
 * e recebe JSON estruturado, em vez de ler a saída do terminal.
 *
 *   claude mcp add onboarding-kit -- npx onboarding-kit mcp
 */

interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run(args: Record<string, unknown>): unknown;
}

const PROTOCOL = "2025-06-18";

function readData(file: string): OnboardingData {
  if (!existsSync(file)) throw new Error(`${relative(process.cwd(), file)} não existe. Chame onboarding_init primeiro.`);
  return JSON.parse(readFileSync(file, "utf8"));
}

export function mcpTools(file = resolveFile()): Tool[] {
  const root = dirname(file);
  const noArgs = { type: "object", properties: {} };
  return [
    {
      name: "onboarding_init",
      description: "Cria o onboarding.json em branco, com as instruções para preencher e os subprojetos detectados. Não mexe em rotas. Não sobrescreve um arquivo existente.",
      inputSchema: { type: "object", properties: { language: { type: "string", description: "Idioma do conteúdo, ex.: pt-BR, en, es." } } },
      run({ language }) {
        if (existsSync(file)) return { created: false, file, message: "O arquivo já existe." };
        const { pkg, deno } = readProjectManifests(root);
        const template = createTemplate({ framework: detectFramework(pkg, deno), language: typeof language === "string" ? language : undefined, subprojects: detectSubprojects(root) });
        writeFileSync(file, JSON.stringify(template, null, 2) + "\n");
        return { created: true, file };
      },
    },
    {
      name: "onboarding_instructions",
      description: "Instruções para preencher o onboarding.json: regras gerais, dicas do framework e o que vai em cada seção. Use antes de escrever.",
      inputSchema: { type: "object", properties: { section: { type: "string", description: "Uma seção só (ex.: architecture). Vazio = todas." } } },
      run({ section }) {
        const data = existsSync(file) ? readData(file) : createTemplate({ framework: "node" });
        const instructions = (data._instructions ?? createTemplate({ framework: "node" })._instructions) as Record<string, any>;
        return typeof section === "string" && section ? { section, instructions: instructions.sections?.[section] ?? null } : instructions;
      },
    },
    {
      name: "onboarding_facts",
      description: "Fatos coletados do git e do código: framework, subprojetos, branches, padrão de commits, CI, hooks, testes, sinais de arquitetura, TODOs e observações em comentários.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Pasta de um subprojeto do monorepo (ex.: apps/web)." },
          people: { type: "boolean", description: "Inclui CODEOWNERS e autores por área (só se o time pediu a seção people)." },
        },
      },
      run: ({ project, people }) => collectFacts(root, { project: typeof project === "string" ? project : undefined, people: people === true }),
    },
    {
      name: "onboarding_status",
      description: "O que mudou no código desde meta.commit: itens desatualizados, evidências que mudaram de lugar ou foram apagadas, arquivos novos, feedback de quem leu e o prompt de atualização.",
      inputSchema: noArgs,
      run() {
        const report = onboardingStatus(readData(file), root);
        return { ...report, prompt: statusPrompt(report, relative(process.cwd(), file)) ?? null };
      },
    },
    {
      name: "onboarding_fix_evidence",
      description: "Corrige no onboarding.json as evidências que só mudaram de linha ou de arquivo desde meta.commit.",
      inputSchema: noArgs,
      run() {
        const data = readData(file);
        const report = onboardingStatus(data, root);
        const applied = applyDrift(data, report.drift);
        if (applied) writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
        return { applied, drift: report.drift };
      },
    },
    {
      name: "onboarding_translate",
      description:
        "Tradução incremental do conteúdo (ex.: para inglês). Sem `translations`, devolve só os textos que faltam traduzir, por caminho. Com `translations` ({caminho: texto traduzido}), guarda e devolve o que ainda falta. Não precisa ler o repositório.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", enum: ["en", "pt"], description: "Idioma de destino." },
          translations: { type: "object", additionalProperties: { type: "string" }, description: "Textos traduzidos, com as mesmas chaves recebidas." },
        },
        required: ["to"],
      },
      run({ to, translations }) {
        const data = readData(file);
        const lang = parseLang(typeof to === "string" ? to : undefined) ?? "en";
        let translation = readTranslation(file, lang);
        let added = 0;
        if (translations && typeof translations === "object") {
          ({ translation, added } = addTranslations(data, translation, lang, translations as Record<string, unknown>));
          writeFileSync(translationFile(file, lang), JSON.stringify(translation, null, 2) + "\n");
        }
        const pending = pendingStrings(data, translation);
        return { added, remaining: Object.keys(pending).length, instructions: todoInstructions(lang), pending };
      },
    },
    {
      name: "onboarding_validate",
      description: "Valida o onboarding.json: campos, evidências, segredos, Mermaid, limites. Devolve erros, avisos e a nota de cobertura. Repita até não sobrar erro.",
      inputSchema: noArgs,
      run() {
        const data = readData(file);
        const issues = validateOnboarding(data, { root });
        return { ok: !issues.some((i) => i.level === "error"), coverage: coverageScore(data), issues };
      },
    },
  ];
}

export interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: number | string | null;
  method?: string;
  params?: Record<string, any>;
}

/** Responde uma mensagem JSON-RPC do MCP; undefined para notificações. */
export async function handleMcpMessage(msg: JsonRpcMessage, tools: Tool[]): Promise<Record<string, unknown> | undefined> {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id: msg.id ?? null, error: { code, message } });
  if (msg.id === undefined || msg.id === null) return undefined; // notificação (ex.: notifications/initialized)
  switch (msg.method) {
    case "initialize":
      return reply({
        protocolVersion: typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: "onboarding-kit", version: VERSION },
        instructions:
          "Ferramentas para criar e manter o onboarding.json deste repositório. Para criar: onboarding_init, onboarding_instructions, onboarding_facts, preencha o arquivo e repita onboarding_validate até não haver erros. Para atualizar: onboarding_status e onboarding_fix_evidence, revise os itens listados, atualize meta.commit e valide.",
      });
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const tool = tools.find((t) => t.name === msg.params?.name);
      if (!tool) return fail(-32602, `Ferramenta desconhecida: ${msg.params?.name}`);
      try {
        const result = await tool.run(msg.params?.arguments ?? {});
        return reply({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
      } catch (err) {
        return reply({ content: [{ type: "text", text: (err as Error).message }], isError: true });
      }
    }
    default:
      return fail(-32601, `Método não suportado: ${msg.method}`);
  }
}

/** Loop stdio: uma mensagem JSON por linha, como manda o transporte stdio do MCP. */
export function runMcpServer(file?: string): Promise<void> {
  const tools = mcpTools(resolveFile(file));
  const rl = createInterface({ input: process.stdin });
  rl.on("line", async (line) => {
    if (!line.trim()) return;
    let msg: JsonRpcMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }) + "\n");
      return;
    }
    const out = await handleMcpMessage(msg, tools);
    if (out) process.stdout.write(JSON.stringify(out) + "\n");
  });
  return new Promise((resolve) => rl.on("close", resolve));
}
