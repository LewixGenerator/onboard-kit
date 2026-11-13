import { execFileSync, spawnSync } from "node:child_process";

const ALLOWED_TOOLS =
  "Read,Write,Edit,Glob,Grep,Bash(npx onboarding-kit:*),Bash(git log:*),Bash(git diff:*),Bash(git show:*),Bash(git rev-parse:*),Bash(git ls-files:*),Bash(git remote:*)";

/** CLIs de IA que sabem editar o repositório sozinhas a partir de um prompt. */
export const AI_CLIS: Record<string, { bin: string; args: (prompt: string) => string[]; stdinArgs: string[] }> = {
  claude: {
    bin: "claude",
    // só o que a tarefa precisa: ler, editar e rodar o onboarding-kit e o git em modo leitura
    args: (prompt) => [
      "-p",
      prompt,
      "--allowedTools",
      ALLOWED_TOOLS,
    ],
    // sem o prompt como argumento, `claude -p` lê da entrada padrão
    stdinArgs: ["-p", "--allowedTools", ALLOWED_TOOLS],
  },
  codex: { bin: "codex", args: (prompt) => ["exec", "--full-auto", prompt], stdinArgs: ["exec", "--full-auto", "-"] },
  gemini: { bin: "gemini", args: (prompt) => ["--yolo", "-p", prompt], stdinArgs: ["--yolo"] },
};

/**
 * No Windows, CLIs instaladas pelo npm são atalhos .cmd, que o Node só executa pelo shell.
 * Pelo cmd.exe, um prompt com aspas e quebras de linha não sobrevive como argumento: ele vai pela entrada padrão.
 */
const WINDOWS = process.platform === "win32";
const quoteCmd = (arg: string) => (/^[\w./:=-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '""')}"`);

function installed(bin: string): boolean {
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore", timeout: 15_000, shell: WINDOWS });
    return true;
  } catch {
    return false;
  }
}

/** A IA pedida (--ai claude) ou a primeira instalada, na ordem de AI_CLIS. */
export function detectAiCli(preferred?: string): string | undefined {
  if (preferred && preferred !== "auto") return AI_CLIS[preferred] && installed(AI_CLIS[preferred].bin) ? preferred : undefined;
  return Object.keys(AI_CLIS).find((name) => installed(AI_CLIS[name].bin));
}

/** Roda a IA no terminal atual, mostrando o que ela faz. Devolve o código de saída. */
export function runAi(name: string, prompt: string, cwd = process.cwd()): number {
  const cli = AI_CLIS[name];
  const result = WINDOWS
    ? spawnSync([cli.bin, ...cli.stdinArgs].map(quoteCmd).join(" "), { cwd, shell: true, input: prompt, stdio: ["pipe", "inherit", "inherit"] })
    : spawnSync(cli.bin, cli.args(prompt), { cwd, stdio: "inherit" });
  return result.status ?? 1;
}
