/**
 * JSON Schema do onboarding.json, para autocomplete e validação no editor e na IA.
 * O build grava em dist/onboarding.schema.json; o template aponta para ele em "$schema".
 * Regras que dependem do repositório (evidências existem, segredos) ficam no `validate`.
 */

type Schema = Record<string, unknown>;

const str = (description?: string, extra: Schema = {}): Schema => ({ type: "string", ...(description ? { description } : {}), ...extra });
const list = (items: Schema, description?: string, maxItems?: number): Schema => ({
  type: "array",
  items,
  ...(description ? { description } : {}),
  ...(maxItems ? { maxItems } : {}),
});
const obj = (properties: Record<string, Schema>, required: string[] = [], description?: string): Schema => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  ...(description ? { description } : {}),
});

const evidence = str("Arquivo do repositório, relativo à raiz: caminho/arquivo.ts ou caminho/arquivo.ts:42.", { pattern: "^(?![/\\\\])(?![A-Za-z]:)" });
const evidenceList = list(evidence, "Onde isso aparece no código.");
const confidence = str('"verified" quando a linha citada comprova sozinha; "inferred" quando foi deduzido de vários arquivos.', { enum: ["verified", "inferred"] });
const titled = (extra: Record<string, Schema> = {}, required = ["title"]) =>
  obj({ title: str(), description: str(), ...extra, evidence: evidenceList, confidence }, required);

export function onboardingSchema(version: string): Schema {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: `https://unpkg.com/onboarding-kit@${version}/dist/onboarding.schema.json`,
    title: "onboarding.json",
    description: "Onboarding do projeto, preenchido pela IA local e apresentado pelo onboarding-kit em /onboarding.",
    type: "object",
    required: ["meta", "project", "gettingStarted", "stack", "architecture", "conventions", "domain", "features", "tours", "gotchas", "decisions", "firstTasks"],
    properties: {
      $schema: str(),
      _instructions: { description: "Instruções para a IA. Não remova: são usadas nas atualizações." },
      meta: obj(
        {
          schemaVersion: str(),
          status: { enum: ["pending", "filled"], description: '"filled" depois que a IA preencheu.' },
          language: str("Idioma do conteúdo, ex.: pt-BR, en, es."),
          framework: str(),
          generatedAt: str("Data e hora em ISO 8601."),
          generatedBy: str("Ferramenta e modelo que preencheram."),
          commit: str("Saída de `git rev-parse HEAD` no momento da análise."),
        },
        ["status", "language"],
      ),
      project: obj(
        {
          name: str(),
          tagline: str("Uma frase que resume o projeto.", { maxLength: 160 }),
          purpose: str("O problema que o projeto resolve e para quem, em 2 a 4 frases."),
          audience: str("Quem usa o produto."),
          status: str("Fase: em produção, MVP, em migração..."),
          repoUrl: str("URL https do repositório; vira link nas evidências."),
        },
        ["name", "purpose"],
      ),
      business: obj({
        model: str("Como o produto gera valor ou receita."),
        valueProposition: str(),
        actors: list(obj({ name: str(), description: str(), evidence: evidenceList, confidence }, ["name"])),
        flows: list(obj({ name: str(), steps: list(str()), evidence: evidenceList, confidence }, ["name"])),
      }),
      gettingStarted: obj({
        prerequisites: list(str()),
        setup: list(str()),
        commands: list(obj({ name: str(), command: str(), description: str() }, ["command"])),
        envVars: list(obj({ name: str(), description: str("Para que serve. Nunca o valor."), required: { type: "boolean" } }, ["name"])),
      }),
      stack: list(obj({ name: str(), category: str(), version: str(), why: str(), evidence: evidenceList, confidence }, ["name"])),
      architecture: obj({
        style: str("Estilo em uma linha: monolito modular, microsserviços, serverless..."),
        patterns: list(obj({ name: str(), description: str(), evidence: evidenceList, confidence }, ["name"]), undefined, 5),
        summary: str(),
        diagram: str("Diagrama Mermaid, sem as cercas ```."),
        modules: list(obj({ name: str(), path: str(), responsibility: str() }, ["path"])),
      }),
      subprojects: list(
        obj(
          {
            name: str(),
            path: str("Pasta relativa à raiz, ex.: apps/web."),
            kind: str("app, serviço, biblioteca compartilhada, config, ferramenta..."),
            framework: str(),
            description: str(),
            dependsOn: list(str(), "names de outros subprojetos que este usa."),
            command: str("Comando para rodar só este projeto, ex.: pnpm --filter web dev."),
          },
          ["name", "path", "description"],
        ),
        "Projetos do monorepo; vazio num projeto único.",
      ),
      conventions: list(titled({ example: str() })),
      domain: obj({
        glossary: list(obj({ term: str(), definition: str() }, ["term"])),
        businessRules: list(titled()),
      }),
      features: list(obj({ name: str(), description: str(), entryPoints: evidenceList, status: str() }, ["name"])),
      tours: list(obj({ title: str(), description: str(), steps: list(obj({ file: evidence, explanation: str() }, ["file"])) }, ["title"])),
      gotchas: list(titled(), undefined, 6),
      decisions: list(obj({ title: str(), context: str(), decision: str(), evidence: evidenceList, confidence }, ["title"])),
      firstTasks: list(obj({ title: str(), description: str(), files: evidenceList }, ["title"])),
      workflow: obj({
        branching: obj({ model: str(), mainBranch: str(), description: str(), branches: list(obj({ pattern: str(), purpose: str() }), undefined, 6), evidence: evidenceList, confidence }),
        commits: obj({ convention: str(), format: str(), examples: list(str(), "Mensagens reais do git log."), enforcedBy: str(), evidence: evidenceList, confidence }),
        pullRequests: obj({ process: str(), checklist: list(str()), evidence: evidenceList, confidence }),
        release: obj({ process: str(), environments: list(obj({ name: str(), trigger: str(), description: str() })), evidence: evidenceList, confidence }),
      }),
      quality: obj({
        testing: obj({ approach: str(), location: str(), command: str(), evidence: evidenceList, confidence }),
        checks: list(obj({ name: str(), when: str(), description: str(), evidence: evidenceList, confidence }, ["name"]), undefined, 6),
      }),
      docs: list(obj({ title: str(), file: evidence, why: str() }, ["file"]), undefined, 6),
      codeNotes: list(obj({ title: str(), description: str(), file: evidence, kind: str() }, ["file"]), undefined, 6),
      todos: list(obj({ title: str(), description: str(), file: evidence, kind: str(), impact: str() }, ["file"]), undefined, 8),
      tracks: list(
        obj(
          {
            id: str("Vai na URL: /onboarding?trilha=<id>.", { pattern: "^[a-z0-9-]+$" }),
            name: str(),
            description: str(),
            chapters: list({ enum: ["why", "business", "product", "language", "rules", "stack", "architecture", "setup", "conventions", "workflow", "people", "quality", "docs", "tours", "gotchas", "todos", "executive", "questions", "mission", "cheatsheet"] }, "Capítulos da trilha; vazio = todos."),
            paths: list(str(), "Subprojetos da trilha; vazio = todos."),
          },
          ["id", "name"],
        ),
        "Trilhas por papel (frontend, backend, QA...).",
        6,
      ),
      people: list(
        obj({ name: str(), role: str(), areas: list(str()), contact: str("Canal ou @usuario. Nunca e-mail ou telefone.") }, ["name"]),
        "Quem procurar em cada área. Só quando o time pede.",
        8,
      ),
      executive: obj({
        summary: str("2 ou 3 frases sobre em que pé o projeto está. Os números o kit calcula sozinho."),
        risks: list(obj({ title: str(), description: str(), evidence: evidenceList, confidence }, ["title"]), "Até 3 riscos reais, com evidência.", 3),
        integrations: list(obj({ name: str("Igual ao nome detectado (Stripe, Sentry...)."), role: str("Para que o projeto usa, em uma frase."), evidence: evidenceList, confidence }, ["name"]), "Papel de cada serviço externo.", 12),
      }),
      openQuestions: list(obj({ question: str(), why: str("O que levantou a dúvida.") }, ["question"]), "Perguntas que o código não responde. Melhor perguntar do que inventar.", 6),
      reviews: {
        type: "object",
        description: "Capítulos revisados por alguém do time (npx onboarding-kit review <capítulo> --by <nome>).",
        additionalProperties: obj({ by: str(), at: str("Data ISO 8601."), commit: str() }, ["by"]),
      },
      brand: obj({
        primaryColor: str("Cor principal em hex (#RRGGBB)."),
        palette: list(str()),
        logo: str("Caminho do logo, relativo à raiz."),
        favicon: str(),
        evidence: evidenceList,
      }),
    },
  };
}
