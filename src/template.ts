import type { Framework, OnboardingData } from "./types";

export const SCHEMA_VERSION = "1";

const FRAMEWORK_HINTS: Record<Framework, string> = {
  next:
    "Projeto Next.js. Identifique se usa App Router (app/) ou Pages Router (pages/), as rotas e layouts, Server Components e Client Components ('use client'), Server Actions, route handlers (app/**/route.ts), middleware.ts, estratégia de fetch e cache, autenticação, estilização (Tailwind, CSS Modules etc.) e onde fica o acesso a dados. Use as rotas principais como base para features e tours. Ignore a rota app/onboarding criada pelo onboarding-kit.",
  nest:
    "Projeto NestJS. Mapeie os módulos (*.module.ts) e as dependências entre eles para architecture.modules e o diagrama. Levante controllers e rotas, providers e services, guards, interceptors, pipes, DTOs e validação (class-validator), entidades e ORM (TypeORM, Prisma, Mongoose), filas, jobs agendados e configuração (ConfigModule). As regras de negócio costumam estar nos services. Ignore o OnboardingModule do onboarding-kit.",
  node:
    "Projeto Node.js. Identifique o ponto de entrada (main e scripts do package.json), o framework HTTP (Express, Fastify, Koa ou http nativo), a organização de rotas e middlewares, o acesso a dados, jobs/workers e scripts utilitários.",
};

const SECTION_INSTRUCTIONS = {
  project:
    "name: nome do projeto. tagline: uma frase que resume o projeto. purpose: 2 a 4 frases sobre o problema que ele resolve e para quem. audience: quem usa o produto (usuários finais, não devs). status: fase do projeto (ex.: em produção, MVP, em migração). repoUrl: URL do repositório (git remote get-url origin, convertida para https), vazio se não houver.",
  business:
    "Explique o negócio para alguém que nunca ouviu falar do produto. model: como o produto gera valor ou receita (assinatura, comissão, venda, uso interno...). Baseie-se em planos, pagamentos, roles e docs do repositório; se não der para inferir a receita, descreva o valor gerado sem inventar. valueProposition: o que o produto resolve para quem usa, em 1 ou 2 frases. actors: os perfis que participam (tipos de usuário, roles, sistemas parceiros), com evidence de onde aparecem no código. flows: 1 a 3 jornadas principais (ex.: 'Do cadastro à primeira compra'), cada uma com 3 a 6 passos curtos e evidence.",
  gettingStarted:
    "prerequisites: o que precisa estar instalado (versão do Node, banco, Docker...). setup: passos em ordem para rodar localmente pela primeira vez. commands: scripts úteis do package.json com o comando exato e o que fazem. envVars: variáveis de ambiente (de .env.example, código ou docs) com nome, para que servem e se são obrigatórias. NUNCA inclua valores.",
  stack:
    "Uma entrada por tecnologia relevante (linguagem, framework, banco, ORM, auth, testes, lint, deploy, filas, libs centrais). category: ex. framework, database, orm, testing, styling, infra. version: do package.json/lockfile. why: para que é usada NESTE projeto. evidence: onde aparece (package.json, arquivo de config ou de uso).",
  architecture:
    "style: o estilo arquitetural em uma linha (ex.: 'Monolito modular em camadas', 'Microsserviços que conversam por fila', 'Serverless', 'Arquitetura hexagonal'); use os sinais de `facts` (monorepo, Dockerfiles, pastas de camadas, libs de mensageria) e diga em que se baseou. patterns: até 5 padrões que dão forma ao código e que a pessoa vai encontrar logo (Repository, injeção de dependência, CQRS, eventos de domínio, Server Actions...), cada um com description curta de como aparece aqui e evidence. summary: como o código está organizado e como uma requisição/ação flui pelo sistema. diagram: diagrama Mermaid (graph TD ou flowchart) com os principais módulos e integrações externas, sem cercas ```. modules: pastas ou módulos principais com path e responsibility.",
  conventions:
    "Padrões de código que alguém novo precisa seguir: nomenclatura, estrutura de pastas, tratamento de erro, validação, padrões de componentes, testes, commits, lint/format. example: trecho curto real ou ilustrativo. evidence obrigatória.",
  domain:
    "glossary: termos do negócio que aparecem no código e nas telas, com definição em linguagem simples. businessRules: regras de negócio macro (ex.: quem pode fazer o quê, limites, cálculos, estados de um pedido), com evidence apontando onde a regra está implementada.",
  features:
    "Funcionalidades do produto do ponto de vista do usuário. entryPoints: arquivos onde a feature começa (página, controller, rota). status: ex. estável, beta, em desenvolvimento, descontinuada.",
  tours:
    "1 a 3 tours guiados pelo código, ex.: 'Como uma requisição é atendida', 'Ciclo de vida de um pedido'. Cada step aponta um arquivo (com linha quando ajudar) e explica o que olhar ali. Ordene os steps na sequência de leitura.",
  gotchas:
    "Até 6 armadilhas: comportamentos não óbvios, partes frágeis, workarounds, coisas que costumam quebrar. TODOs vão em `todos`, não aqui. Só inclua o que tiver evidence.",
  workflow:
    "Como o código chega em produção, a partir dos fatos de `npx onboarding-kit facts` (branches, commits recentes, CI, hooks) e de CONTRIBUTING/README. branching: model (GitHub Flow, GitFlow, trunk-based...; só afirme o modelo se o histórico ou a doc mostrarem), mainBranch, description em 1 ou 2 frases, branches: até 6 padrões de nome (ex.: 'feature/<ticket>-<descricao>') com purpose. commits: convention (ex.: Conventional Commits) só se a maioria dos commits seguir ou houver commitlint; format: o molde da mensagem; examples: 2 a 4 mensagens REAIS do git log; enforcedBy: commitlint/husky/etc. ou vazio. pullRequests: process (quem revisa, quantas aprovações, squash ou merge, CODEOWNERS) e checklist: até 5 itens do template de PR. release: process (como vira versão/deploy: tags, semantic-release, changesets, deploy automático no merge...) e environments: ambientes com name, trigger (ex.: 'merge na main') e description. Deixe vazio o que não der para comprovar.",
  quality:
    "testing.approach: como o time testa, em 1 ou 2 frases (ex.: 'Testes unitários ao lado do código com Vitest; e2e com Playwright nos fluxos de compra'). Só diga TDD se estiver documentado ou se o histórico mostrar testes chegando junto/antes do código. Use as contagens de `facts` (arquivos de teste x código) para dar a real, sem julgamento. location: onde ficam os testes. command: comando exato para rodar. checks: até 6 verificações automáticas (lint, typecheck, testes na CI, hooks de pre-commit, análise de segurança, preview deploy) com when (pre-commit, PR, merge, deploy) e evidence.",
  docs:
    "Até 6 documentos que um dev novo deve ler na primeira semana (README, CONTRIBUTING, ADRs, docs/, guias de API, runbooks), do mais importante para o menos. file: caminho. why: o que a pessoa aprende ali, em 1 frase. Não liste documentos vazios ou genéricos.",
  codeNotes:
    "Até 6 observações deixadas em comentários no código que alguém novo PRECISA conhecer: avisos (WARNING/IMPORTANT/NOTE), APIs @deprecated que não devem ser usadas, regras explicadas em comentário. Use a lista de marcadores de `facts`. title curto, description em linguagem simples, file com linha, kind (NOTE, IMPORTANT, WARNING, DEPRECATED).",
  todos:
    "Até 8 TODOs/FIXMEs/HACKs que importam para quem está chegando (dívidas técnicas que afetam regra de negócio, partes provisórias, coisas que bloqueiam upgrades), escolhidos da lista de `facts`. Ignore TODOs triviais. title curto, description do que falta, file com linha, kind (TODO, FIXME, HACK, XXX, BUG), impact: por que isso importa para a pessoa nova. A apresentação já mostra a contagem total sozinha.",
  decisions:
    "Decisões de arquitetura perceptíveis no código ou na documentação (ex.: por que tal ORM, monorepo, cache, autenticação). context: o problema. decision: o que foi escolhido. Não invente motivos: se o motivo não está documentado, descreva só a decisão.",
  brand:
    "Identidade visual, usada para a apresentação ter a cara da plataforma. primaryColor: a cor principal da marca em hex (#RRGGBB). Procure em tailwind.config (theme.extend.colors: brand, primary), no @theme do Tailwind v4 (--color-primary, --color-brand), em variáveis CSS de globals.css/index.css (--primary, --brand; converta HSL/OKLCH para hex), em temas de MUI/Chakra/styled-components (palette.primary.main) e no theme_color do manifest. palette: 1 a 4 outras cores da marca em hex (secundária, destaque). Ignore branco, preto e cinzas quando houver uma cor de verdade. logo: caminho do logo do projeto (procure em public/, assets/, src/assets/, app/icon.*); prefira SVG e a versão para fundo claro; ignore os arquivos de exemplo do framework (next.svg, vercel.svg, vite.svg, react.svg). favicon: caminho do favicon (public/favicon.ico, app/favicon.ico, app/icon.png). evidence: arquivos de onde tirou as cores. Deixe vazio o que não encontrar: o onboarding-kit tenta detectar sozinho.",
  firstTasks:
    "3 a 5 tarefas pequenas e seguras para alguém novo começar (ex.: um teste faltando, um TODO simples, uma melhoria de mensagem de erro), com os arquivos envolvidos.",
};

export interface TemplateOptions {
  framework: Framework;
  language?: string;
}

export function createTemplate({ framework, language = "pt-BR" }: TemplateOptions): OnboardingData {
  return {
    _instructions: {
      readme:
        "Você é a IA local deste projeto. Sua tarefa é preencher este arquivo analisando o código do repositório. O resultado será exibido em /onboarding para quem está chegando no projeto.",
      steps: [
        "1. Leia este arquivo inteiro antes de começar, incluindo _instructions.sections.",
        "2. Rode `npx onboarding-kit facts` para ver os fatos coletados do git e do código (branches, padrão dos commits, CI, hooks, testes, sinais de arquitetura, TODOs e observações em comentários). Depois explore o repositório: package.json e lockfile, README e docs, arquivos de config (tsconfig, eslint, prettier, next.config, nest-cli.json, docker, CI), código-fonte, testes e .env.example.",
        "3. Preencha cada seção seguindo _instructions.sections.<seção> e _instructions.framework. Os arrays vêm com um item modelo em branco: substitua-o por itens reais, quantos forem necessários. Se não houver nada real para a seção, deixe o array vazio ([]).",
        "4. Preencha meta: status = \"filled\", generatedAt = data e hora atuais em ISO 8601, generatedBy = nome da ferramenta e do modelo, commit = saída de `git rev-parse HEAD` (vazio se não houver git).",
        "5. Rode `npx onboarding-kit validate` e corrija tudo o que ele apontar até passar sem erros.",
      ],
      rules: [
        "Escreva todo o conteúdo no idioma de meta.language.",
        "Nunca invente. Toda afirmação sobre stack, convenções, regras, decisões e armadilhas precisa de evidence com arquivos reais, no formato caminho/relativo ou caminho/relativo:linha. Se não encontrar evidência, não inclua o item.",
        "Caminhos são relativos à raiz do repositório e usam '/'.",
        "Nunca copie segredos: valores de .env, tokens, chaves de API, senhas ou URLs com credenciais. Em envVars descreva apenas o nome e a finalidade.",
        "Mantenha o JSON válido. Não renomeie nem remova chaves e não apague _instructions: ele é usado nas próximas atualizações.",
        "Escreva de forma curta, direta e humana, como um colega explicando o projeto: quem lê é uma pessoa recém-contratada que precisa entender a regra de negócio e os padrões do time. O conteúdo vira slides, então prefira frases curtas a parágrafos longos.",
        "Menos é mais: respeite os limites de itens de cada seção e escolha o que a pessoa precisa na primeira semana. Um item ótimo vale mais que cinco medianos.",
        "Se meta.status já for \"filled\", você está ATUALIZANDO: use `git diff <meta.commit>..HEAD` para revisar apenas o que mudou, mantenha o restante e atualize meta.commit e meta.generatedAt.",
      ],
      framework: FRAMEWORK_HINTS[framework],
      sections: SECTION_INSTRUCTIONS,
    },
    meta: {
      schemaVersion: SCHEMA_VERSION,
      status: "pending",
      language,
      framework,
      generatedAt: "",
      generatedBy: "",
      commit: "",
    },
    project: { name: "", tagline: "", purpose: "", audience: "", status: "", repoUrl: "" },
    business: {
      model: "",
      valueProposition: "",
      actors: [{ name: "", description: "", evidence: [""] }],
      flows: [{ name: "", steps: [""], evidence: [""] }],
    },
    gettingStarted: {
      prerequisites: [""],
      setup: [""],
      commands: [{ name: "", command: "", description: "" }],
      envVars: [{ name: "", description: "", required: false }],
    },
    stack: [{ name: "", category: "", version: "", why: "", evidence: [""] }],
    architecture: {
      style: "",
      patterns: [{ name: "", description: "", evidence: [""] }],
      summary: "",
      diagram: "",
      modules: [{ name: "", path: "", responsibility: "" }],
    },
    conventions: [{ title: "", description: "", example: "", evidence: [""] }],
    domain: {
      glossary: [{ term: "", definition: "" }],
      businessRules: [{ title: "", description: "", evidence: [""] }],
    },
    features: [{ name: "", description: "", entryPoints: [""], status: "" }],
    tours: [{ title: "", description: "", steps: [{ file: "", explanation: "" }] }],
    gotchas: [{ title: "", description: "", evidence: [""] }],
    decisions: [{ title: "", context: "", decision: "", evidence: [""] }],
    firstTasks: [{ title: "", description: "", files: [""] }],
    workflow: {
      branching: { model: "", mainBranch: "", description: "", branches: [{ pattern: "", purpose: "" }], evidence: [""] },
      commits: { convention: "", format: "", examples: [""], enforcedBy: "", evidence: [""] },
      pullRequests: { process: "", checklist: [""], evidence: [""] },
      release: { process: "", environments: [{ name: "", trigger: "", description: "" }], evidence: [""] },
    },
    quality: {
      testing: { approach: "", location: "", command: "", evidence: [""] },
      checks: [{ name: "", when: "", description: "", evidence: [""] }],
    },
    docs: [{ title: "", file: "", why: "" }],
    codeNotes: [{ title: "", description: "", file: "", kind: "" }],
    todos: [{ title: "", description: "", file: "", kind: "", impact: "" }],
    brand: { primaryColor: "", palette: [""], logo: "", favicon: "", evidence: [""] },
  };
}

/**
 * Frase para colar na IA local. Com `init`, pede para a IA criar o arquivo antes
 * (usado quando o onboarding.json ainda não existe).
 */
export function aiPrompt(file = "onboarding.json", options: { init?: boolean } = {}): string {
  if (options.init) {
    return `Rode "npx onboarding-kit init" na raiz deste projeto para criar o ${file}. Depois leia o arquivo e siga as instruções em "_instructions" para preenchê-lo com base neste repositório. No final, rode "npx onboarding-kit validate" e corrija o que ele apontar.`;
  }
  return `Leia o arquivo ${file} e siga as instruções em "_instructions" para preenchê-lo com base neste repositório. No final, rode "npx onboarding-kit validate" e corrija o que ele apontar.`;
}
