/**
 * Formato do arquivo onboarding.json.
 * Chaves que começam com "_" (ex.: "_instructions") são para a IA e são ignoradas pelo visualizador.
 */

/** Referência a um trecho do código: "caminho/arquivo.ts" ou "caminho/arquivo.ts:42". */
export type Evidence = string;

export type Framework = "next" | "nest" | "node";

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

export interface Architecture {
  summary: string;
  /** Diagrama em sintaxe Mermaid (sem as cercas ```). */
  diagram: string;
  modules: ArchitectureModule[];
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
  /** Cores e logo do projeto, usados para dar a cara da marca à apresentação. Opcional. */
  brand?: BrandInfo;
}

export interface OnboardingOptions {
  /** Caminho do onboarding.json. Padrão: "<cwd>/onboarding.json". */
  file?: string;
  /** Liga ou desliga a rota. Padrão: ligada fora de produção (NODE_ENV !== "production"). */
  enabled?: boolean;
}
