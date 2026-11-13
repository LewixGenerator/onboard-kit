/**
 * Formato do arquivo onboarding.json.
 * Chaves que começam com "_" (ex.: "_instructions") são para a IA e são ignoradas pelo visualizador.
 */

/** Referência a um trecho do código: "caminho/arquivo.ts" ou "caminho/arquivo.ts:42". */
export type Evidence = string;

/** verified: uma evidência comprova sozinha; inferred: deduzido de vários arquivos. */
export type Confidence = "verified" | "inferred";

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
  confidence?: Confidence;
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
  confidence?: Confidence;
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

/** Recorte da apresentação para um papel (frontend, backend, QA...): /onboarding?trilha=<id>. */
export interface Track {
  /** Usado na URL: minúsculas e hífens (ex.: frontend). */
  id: string;
  name: string;
  description: string;
  /** Capítulos da trilha (why, business, product, language, rules, stack, architecture, setup, conventions, workflow, people, quality, docs, tours, gotchas, todos, mission, cheatsheet). Vazio = todos. */
  chapters: string[];
  /** Subprojetos (path) que interessam à trilha. Vazio = todos. */
  paths: string[];
}

/** Quem conhece cada parte do código. Só preenchido quando o time pede (init --people). */
export interface Person {
  name: string;
  /** Papel no time, se estiver documentado (ex.: tech lead do checkout). */
  role: string;
  /** Pastas ou subprojetos que a pessoa conhece. */
  areas: string[];
  /** Como falar com ela (canal, @usuario). Nunca e-mail pessoal ou telefone. */
  contact: string;
}

export interface Convention {
  title: string;
  description: string;
  example: string;
  evidence: Evidence[];
  confidence?: Confidence;
}

export interface BusinessActor {
  name: string;
  description: string;
  evidence: Evidence[];
  confidence?: Confidence;
}

export interface BusinessFlow {
  name: string;
  steps: string[];
  evidence: Evidence[];
  confidence?: Confidence;
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
  confidence?: Confidence;
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
  confidence?: Confidence;
}

export interface Decision {
  title: string;
  context: string;
  decision: string;
  evidence: Evidence[];
  confidence?: Confidence;
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

export interface Risk {
  title: string;
  description: string;
  evidence: Evidence[];
  confidence?: Confidence;
}

export interface IntegrationNote {
  /** Nome do serviço, igual ao detectado (Stripe, Sentry...) ou um que o kit não detectou. */
  name: string;
  /** Para que o projeto usa, em uma frase. */
  role: string;
  evidence: Evidence[];
}

/** Visão de P.O./CTO. Os números (releases, atividade, testes...) o kit calcula sozinho. */
export interface Executive {
  /** 2 ou 3 frases: em que pé o projeto está. */
  summary: string;
  /** Até 3 riscos reais, com evidência. */
  risks: Risk[];
  integrations: IntegrationNote[];
}

/** Pergunta que o código não responde: melhor perguntar do que a IA inventar. */
export interface OpenQuestion {
  question: string;
  /** Por que importa ou o que a IA viu que levantou a dúvida. */
  why: string;
}

/** Revisão humana de um capítulo. */
export interface Review {
  by: string;
  at: string;
  commit: string;
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
  /** Trilhas por papel. Opcional. */
  tracks?: Track[];
  /** Quem procurar em cada área. Opcional e desligado por padrão. */
  people?: Person[];
  /** Visão executiva: resumo, riscos e o papel de cada integração. */
  executive?: Executive;
  /** O que a IA não conseguiu descobrir no código. */
  openQuestions?: OpenQuestion[];
  /** Capítulos revisados por alguém do time (npx onboarding-kit review). */
  reviews?: Record<string, Review>;
}

export interface OnboardingOptions {
  /** Caminho do onboarding.json. Padrão: "<cwd>/onboarding.json". */
  file?: string;
  /** Liga ou desliga a rota. Padrão: ligada fora de produção, ou em qualquer ambiente quando há senha. */
  enabled?: boolean;
  /** Pede senha (HTTP Basic, qualquer usuário). Padrão: a variável ONBOARDING_PASSWORD. */
  password?: string;
  /** Botão "ficou confuso?" em cada slide, salvo em onboarding-feedback.json. Padrão: ligado. */
  feedback?: boolean;
}
