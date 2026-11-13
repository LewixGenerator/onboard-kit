import { execFileSync, spawnSync } from "node:child_process";

/** CLIs de IA que sabem editar o repositório sozinhas a partir de um prompt. */
export const AI_CLIS: Record<string, { bin: string; args: (prompt: string) => string[] }> = {
  claude: {
    bin: "claude",
    // só o que a tarefa precisa: ler, editar e rodar o onboarding-kit e o git em modo leitura
    args: (prompt) => [
      "-p",
      prompt,
      "--allowedTools",
      "Read,Write,Edit,Glob,Grep,Bash(npx onboarding-kit:*),Bash(git log:*),Bash(git diff:*),Bash(git show:*),Bash(git rev-parse:*),Bash(git ls-files:*),Bash(git remote:*)",
    ],
  },
  codex: { bin: "codex", args: (prompt) => ["exec", "--full-auto", prompt] },
  gemini: { bin: "gemini", args: (prompt) => ["--yolo", "-p", prompt] },
};

function installed(bin: string): boolean {
  try {
    execFileSync(bin, ["--version"], { stdio: "ignore", timeout: 15_000 });
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
  const result = spawnSync(cli.bin, cli.args(prompt), { cwd, stdio: "inherit" });
  return result.status ?? 1;
}
