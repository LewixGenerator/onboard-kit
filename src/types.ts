/**
 * Formato do arquivo onboarding.json.
 * Chaves que começam com "_" (ex.: "_instructions") são para a IA e são ignoradas pelo visualizador.
 */

/** Referência a um trecho do código: "caminho/arquivo.ts" ou "caminho/arquivo.ts:42". */
export type Evidence = string;

export type Framework =
  | "next"
  | "nuxt"
  | "sveltekit"
  | "astro"
  | "remix"
  | "gatsby"
  | "nest"
  | "adonis"
  | "express"
  | "fastify"
  | "koa"
  | "hono"
  | "elysia"
  | "angular"
  | "vite"
  | "cra"
  | "webpack"
  | "react-native"
  | "electron"
  | "library"
  | "node";

export interface OnboardingMeta {
  schemaVersion: string;
  /** "pending" enquanto a IA não preencheu; "filled" depois. */
  status: "pending" | "filled";
  /** Idioma em que a IA deve escrever o conteúdo, ex.: "pt-BR". */
  language: string;
  framework: Framework | "";
  generatedAt: string;
  generatedBy: string;
  /** Hash do commit (git rev-parse HEAD) analisado. */
  commit: string;
}

export interface OnboardingProject {
  name: string;
  tagline: string;
  purpose: string;
  audience: string;
  status: string;
  repoUrl: string;
}

export interface GettingStarted {
  prerequisites: string[];
  setup: string[];
  commands: { name: string; command: string; description: string }[];
  envVars: { name: string; description: string; required: boolean }[];
}

export interface StackItem {
  name: string;
  category: string;
  version: string;
  why: string;
  evidence: Evidence[];
}

export interface ArchitectureModule {
  name: string;
  path: string;
  responsibility: string;
}

export interface ArchitecturePattern {
  name: string;
  description: string;
  evidence: Evidence[];
}

export interface Architecture {
  /** Estilo em uma linha: monolito modular, microsserviços, serverless, hexagonal, MVC... */
  style?: string;
  /** Padrões de projeto que dão forma ao código (Repository, CQRS, injeção de dependência...). */
  patterns?: ArchitecturePattern[];
  summary: string;
  /** Diagrama em sintaxe Mermaid (sem as cercas ```). */
  diagram: string;
  modules: ArchitectureModule[];
}

export interface SubprojectInfo {
  name: string;
  /** Pasta relativa à raiz (ex.: apps/web). */
  path: string;
  /** app, serviço, biblioteca compartilhada, config, ferramenta... */
  kind: string;
  framework: string;
  /** O que este projeto faz, em 1 ou 2 frases. */
  description: string;
  /** Outros subprojetos de que este depende (pelo name). */
  dependsOn: string[];
  /** Comando para rodar só este projeto (ex.: pnpm --filter web dev). */
  command: string;
}

export interface Convention {
  title: string;
  description: string;
  example: string;
  evidence: Evidence[];
}

export interface BusinessActor {
  name: string;
  description: string;
  evidence: Evidence[];
}

export interface BusinessFlow {
  name: string;
  steps: string[];
  evidence: Evidence[];
}

export interface Business {
  /** Como o produto gera valor ou receita. */
  model: string;
  /** O valor entregue para quem usa. */
  valueProposition: string;
  actors: BusinessActor[];
  flows: BusinessFlow[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface BusinessRule {
  title: string;
  description: string;
  evidence: Evidence[];
}

export interface Feature {
  name: string;
  description: string;
  entryPoints: Evidence[];
  status: string;
}

export interface TourStep {
  file: Evidence;
  explanation: string;
}

export interface Tour {
  title: string;
  description: string;
  steps: TourStep[];
}

export interface Gotcha {
  title: string;
  description: string;
  evidence: Evidence[];
}

export interface Decision {
  title: string;
  context: string;
  decision: string;
  evidence: Evidence[];
}

export interface FirstTask {
  title: string;
  description: string;
  files: Evidence[];
}

export interface Workflow {
  branching: {
    /** Ex.: GitHub Flow, GitFlow, trunk-based. */
    model: string;
    mainBranch: string;
    description: string;
    branches: { pattern: string; purpose: string }[];
    evidence: Evidence[];
  };
  commits: {
    /** Ex.: Conventional Commits. */
    convention: string;
    /** Ex.: "feat(escopo): descrição no imperativo". */
    format: string;
    /** Mensagens reais do histórico que seguem o padrão. */
    examples: string[];
    /** O que garante o padrão (commitlint, husky...), vazio se for só combinado. */
    enforcedBy: string;
    evidence: Evidence[];
  };
  pullRequests: {
    process: string;
    checklist: string[];
    evidence: Evidence[];
  };
  release: {
    process: string;
    environments: { name: string; trigger: string; description: string }[];
    evidence: Evidence[];
  };
}

export interface QualityCheck {
  name: string;
  /** Quando roda: pre-commit, push, PR, deploy... */
  when: string;
  description: string;
  evidence: Evidence[];
}

export interface Quality {
  testing: {
    /** Como o time testa: TDD, testes junto do código, pirâmide... só o que der para comprovar. */
    approach: string;
    location: string;
    command: string;
    evidence: Evidence[];
  };
  checks: QualityCheck[];
}

export interface DocLink {
  title: string;
  file: Evidence;
  /** Por que um dev novo deve ler. */
  why: string;
}

export interface CodeNote {
  title: string;
  description: string;
  file: Evidence;
  /** NOTE, IMPORTANT, WARNING, DEPRECATED... */
  kind: string;
}

export interface TodoItem {
  title: string;
  description: string;
  file: Evidence;
  /** TODO, FIXME, HACK, XXX, BUG. */
  kind: string;
  /** Por que importa para quem está chegando (ex.: afeta pagamentos, bloqueia upgrade). */
  impact: string;
}

export interface BrandInfo {
  /** Cor principal da marca em hex (#RRGGBB). */
  primaryColor: string;
  /** Outras cores da paleta em hex. */
  palette: string[];
  /** Caminho relativo do logo (ex.: public/logo.svg). */
  logo: string;
  /** Caminho relativo do favicon (ex.: public/favicon.ico). */
  favicon: string;
  evidence: Evidence[];
}

export interface OnboardingData {
  $schema?: string;
  _instructions?: unknown;
  meta: OnboardingMeta;
  project: OnboardingProject;
  /** Opcional em arquivos gerados antes da v0.2. */
  business?: Business;
  gettingStarted: GettingStarted;
  stack: StackItem[];
  architecture: Architecture;
  /** Projetos do monorepo ou do repositório com várias pastas de projeto. Vazio num projeto único. */
  subprojects?: SubprojectInfo[];
  conventions: Convention[];
  domain: {
    glossary: GlossaryTerm[];
    businessRules: BusinessRule[];
  };
  features: Feature[];
  tours: Tour[];
  gotchas: Gotcha[];
  decisions: Decision[];
  firstTasks: FirstTask[];
  /** Git, commits, PRs e deploy. Opcional em arquivos antigos. */
  workflow?: Workflow;
  quality?: Quality;
  /** Documentos que valem a leitura na primeira semana. */
  docs?: DocLink[];
  /** Observações importantes deixadas em comentários no código. */
  codeNotes?: CodeNote[];
  /** TODOs/FIXMEs relevantes, escolhidos pela IA. A contagem completa vem da varredura do código. */
  todos?: TodoItem[];
  /** Cores e logo do projeto, usados para dar a cara da marca à apresentação. Opcional. */
  brand?: BrandInfo;
}

export interface OnboardingOptions {
  /** Caminho do onboarding.json. Padrão: "<cwd>/onboarding.json". */
  file?: string;
  /** Liga ou desliga a rota. Padrão: ligada fora de produção (NODE_ENV !== "production"). */
  enabled?: boolean;
}
