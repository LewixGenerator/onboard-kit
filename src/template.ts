import type { Subproject } from "./detect";
import type { Framework, OnboardingData } from "./types";
import { SCHEMA_URL } from "./version";

export const SCHEMA_VERSION = "1";

const FRAMEWORK_HINTS: Record<Framework, string> = {
  next:
    "Projeto Next.js. Identifique se usa App Router (app/) ou Pages Router (pages/), as rotas e layouts, Server Components e Client Components ('use client'), Server Actions, route handlers (app/**/route.ts), middleware.ts, estratégia de fetch e cache, autenticação, estilização (Tailwind, CSS Modules etc.) e onde fica o acesso a dados. Use as rotas principais como base para features e tours. Ignore a rota app/onboarding criada pelo onboarding-kit.",
  nuxt:
    "Projeto Nuxt. Mapeie pages/ (rotas por arquivo), layouts/, components/ (auto-import), composables/ e utils/, stores (Pinia), middleware de rota, plugins/, a API em server/ (server/api, server/routes, server/middleware) e o nuxt.config (módulos, runtimeConfig). Veja se usa Nuxt UI, Content ou Layers. Ignore server/routes/onboarding.ts criado pelo onboarding-kit.",
  sveltekit:
    "Projeto SvelteKit. Mapeie src/routes (+page.svelte, +layout.svelte, +page.server.ts com load e form actions, +server.ts para APIs), src/lib (componentes, stores, $lib/server), hooks.server.ts (auth, sessão), o adapter de deploy no svelte.config e se usa runes (Svelte 5). Ignore src/routes/onboarding criado pelo onboarding-kit.",
  astro:
    "Projeto Astro. Mapeie src/pages (rotas e endpoints), layouts, componentes .astro e as ilhas de framework (React, Vue, Svelte, Solid) com suas diretivas client:*, content collections (src/content, content.config), integrações e o modo de saída (static, server, hybrid) no astro.config.",
  remix:
    "Projeto Remix / React Router (modo framework). Mapeie app/routes (ou app/routes.ts), loaders e actions (onde ficam as regras e o acesso a dados), formulários, sessões e autenticação, root.tsx, entry.server e o deploy. Os loaders/actions são o melhor ponto de partida para tours.",
  gatsby:
    "Projeto Gatsby. Mapeie src/pages, templates, a camada de dados GraphQL (gatsby-node createPages, page queries, useStaticQuery), os plugins e fontes em gatsby-config e o deploy estático.",
  nest:
    "Projeto NestJS. Mapeie os módulos (*.module.ts) e as dependências entre eles para architecture.modules e o diagrama. Levante controllers e rotas, providers e services, guards, interceptors, pipes, DTOs e validação (class-validator), entidades e ORM (TypeORM, Prisma, Mongoose), filas, jobs agendados e configuração (ConfigModule). As regras de negócio costumam estar nos services. Ignore o OnboardingModule do onboarding-kit.",
  adonis:
    "Projeto AdonisJS. Mapeie start/routes.ts, controllers, models do Lucid e migrations, validators (VineJS), middleware, policies/bouncer, providers e as configs em config/. As regras costumam estar em services ou nos models.",
  express:
    "Projeto Express. Identifique o ponto de entrada (main e scripts do package.json), como o app é montado (app.use, routers), a ordem dos middlewares (auth, validação, erros), a organização de rotas/controllers/services, o acesso a dados, jobs e scripts utilitários.",
  fastify:
    "Projeto Fastify. Mapeie os plugins e o encapsulamento (fastify.register, autoload), rotas com seus schemas (JSON Schema, TypeBox, Zod), hooks (onRequest, preHandler), decorators, o acesso a dados e a configuração.",
  koa:
    "Projeto Koa. Mapeie a pilha de middlewares (ordem importa), o roteador (@koa/router), o contexto (ctx.state, ctx.body), o tratamento de erros, o acesso a dados e o ponto de entrada.",
  hono:
    "Projeto Hono. Identifique o runtime (Node, Bun, Deno, Cloudflare Workers, Vercel), o app e os sub-apps (app.route), middlewares, validação (zValidator), bindings/variáveis de ambiente e o cliente RPC (hc) se houver.",
  elysia:
    "Projeto Elysia (Bun). Mapeie as instâncias e plugins (.use), rotas com schemas t.Object, derive/resolve, hooks de ciclo de vida, o cliente Eden se houver e o acesso a dados.",
  angular:
    "Projeto Angular. Mapeie a estrutura (standalone components ou NgModules), rotas e lazy loading, services e injeção de dependência, estado (signals, NgRx, services com RxJS), interceptors HTTP, guards, formulários (reativos ou template) e o angular.json (projetos, builds, ambientes).",
  vite:
    "Projeto com Vite. Descubra a biblioteca de UI (React, Vue, Svelte, Solid, Preact, Qwik ou Lit), o roteador (React Router, TanStack Router, Vue Router...), o estado global (Redux, Zustand, Pinia, TanStack Query...), a camada de API/cliente HTTP, a estrutura de pastas (pages, features, components) e os plugins do vite.config. Se não houver backend aqui, diga de onde vêm os dados.",
  cra:
    "Projeto Create React App. Mapeie src/ (componentes, páginas, hooks), o roteador, o estado global, o cliente HTTP e as variáveis REACT_APP_*. Se houver planos de migrar para Vite/Next, registre como decisão ou gotcha.",
  webpack:
    "Projeto com Webpack (ou Vue CLI). Descubra a biblioteca de UI, o ponto de entrada e as configs de build (webpack.config, vue.config), roteador, estado global e o cliente HTTP.",
  "react-native":
    "Projeto React Native / Expo. Mapeie a navegação (Expo Router em app/ ou React Navigation), telas e componentes, estado global, chamadas de API, módulos nativos e permissões, o app.json/app.config e o processo de build e publicação (EAS, Fastlane, lojas).",
  electron:
    "Projeto Electron. Separe o processo main, os preloads e o renderer (e o framework de UI do renderer), a comunicação IPC (ipcMain/ipcRenderer, contextBridge), acesso a arquivos e ao sistema, auto-update e o empacotamento (electron-builder, Forge).",
  library:
    "Biblioteca ou CLI publicada. Explique a API pública (exports do package.json, bin), como o código está organizado por trás dela, o build (tsc, tsup, rollup, unbuild), a matriz de compatibilidade (Node, ESM/CJS, browsers), o versionamento e o processo de release. Em 'business', explique quem consome a biblioteca e por quê.",
  node:
    "Projeto Node.js. Identifique o ponto de entrada (main e scripts do package.json), o framework HTTP (Express, Fastify, Koa ou http nativo), a organização de rotas e middlewares, o acesso a dados, jobs/workers e scripts utilitários.",
};

const SECTION_INSTRUCTIONS = {
  project:
    "name: nome do projeto. tagline: uma frase que resume o projeto. purpose: 2 a 4 frases sobre o problema que ele resolve e para quem. audience: quem usa o produto (usuários finais, não devs). status: fase do projeto (ex.: em produção, MVP, em migração). repoUrl: URL do repositório (git remote get-url origin, convertida para https), vazio se não houver.",
  business:
    "Explique o negócio para alguém que nunca ouviu falar do produto. model: como o produto gera valor ou receita (assinatura, comissão, venda, uso interno...). Baseie-se em planos, pagamentos, roles e docs do repositório; se não der para inferir a receita, descreva o valor gerado sem inventar. valueProposition: o que o produto resolve para quem usa, em 1 ou 2 frases. actors: os perfis que participam (tipos de usuário, roles, sistemas parceiros), com evidence de onde aparecem no código. flows: 1 a 3 jornadas principais (ex.: 'Do cadastro à primeira compra'), cada uma com 3 a 6 passos curtos e evidence.",
  gettingStarted:
    "prerequisites: o que precisa estar instalado (versão do Node, Bun ou Deno, gerenciador de pacotes, banco, Docker, Xcode/Android Studio em apps mobile...). setup: passos em ordem para rodar localmente pela primeira vez. commands: scripts úteis do package.json com o comando exato e o que fazem. envVars: variáveis de ambiente (de .env.example, código ou docs) com nome, para que servem e se são obrigatórias. NUNCA inclua valores.",
  stack:
    "Uma entrada por tecnologia relevante (linguagem, framework, banco, ORM, auth, testes, lint, deploy, filas, libs centrais). category: ex. framework, database, orm, testing, styling, infra. version: do package.json/lockfile. why: para que é usada NESTE projeto. evidence: onde aparece (package.json, arquivo de config ou de uso).",
  architecture:
    "style: o estilo arquitetural em uma linha (ex.: 'Monolito modular em camadas', 'Microsserviços que conversam por fila', 'Serverless', 'Arquitetura hexagonal'); use os sinais de `facts` (monorepo, Dockerfiles, pastas de camadas, libs de mensageria) e diga em que se baseou. patterns: até 5 padrões que dão forma ao código e que a pessoa vai encontrar logo (Repository, injeção de dependência, CQRS, eventos de domínio, Server Actions...), cada um com description curta de como aparece aqui e evidence. summary: como o código está organizado e como uma requisição/ação flui pelo sistema. diagram: diagrama Mermaid (graph TD ou flowchart) com os principais módulos e integrações externas, sem cercas ```. modules: pastas ou módulos principais com path e responsibility.",
  subprojects:
    "Só em repositórios com mais de um projeto (monorepo com workspaces ou pastas como frontend/ e backend/ com package.json próprio); num projeto único deixe []. Os itens já vêm com o que o onboarding-kit detectou (name, path, framework, dependsOn): confira, remova os que não importam (exemplos, fixtures) e acrescente os que faltarem. kind: app, serviço, biblioteca compartilhada, config, ferramenta... description: o que o projeto faz e quem o usa, em 1 ou 2 frases. dependsOn: names de outros subprojetos que ele importa. command: o comando para rodar só ele a partir da raiz (ex.: 'pnpm --filter web dev', 'npm run dev -w apps/api', 'nx serve api', 'turbo dev --filter=web'), vazio se ele não roda sozinho. Use os subprojetos também em architecture (diagrama com um nó por app e as dependências entre eles), gettingStarted.commands e features.entryPoints.",
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
    "Identidade visual, usada para a apresentação ter a cara da plataforma. primaryColor: a cor principal da marca em hex (#RRGGBB). Procure em tailwind.config (theme.extend.colors: brand, primary), no @theme do Tailwind v4 (--color-primary, --color-brand), em variáveis CSS de globals.css/index.css (--primary, --brand; converta HSL/OKLCH para hex), em temas de MUI/Chakra/styled-components (palette.primary.main), Vuetify, Quasar, UnoCSS, Panda, Nuxt UI (app.config: ui.primary), Angular Material, em blocos <style> de App.vue/+layout.svelte/Layout.astro, no app.json do Expo e no theme_color do manifest. palette: 1 a 4 outras cores da marca em hex (secundária, destaque). Ignore branco, preto e cinzas quando houver uma cor de verdade. logo: caminho do logo do projeto (procure em public/, static/, assets/, src/assets/, src/lib/assets/, app/icon.*, resources/ e build/ no Electron, assets/ no Expo); prefira SVG e a versão para fundo claro; ignore os arquivos de exemplo do framework (next.svg, vercel.svg, vite.svg, react.svg, nuxt.svg, svelte.svg, astro.svg...). favicon: caminho do favicon (public/favicon.ico, app/favicon.ico, app/icon.png). evidence: arquivos de onde tirou as cores. Deixe vazio o que não encontrar: o onboarding-kit tenta detectar sozinho.",
  tracks:
    "Opcional. Quando o projeto tem públicos diferentes (frontend, backend, mobile, dados, QA, produto), crie 2 a 4 trilhas; num projeto pequeno deixe []. id: minúsculas com hífen, vai na URL (/onboarding?trilha=frontend). name e description curtos. chapters: os capítulos que a trilha mostra, entre why, business, product, language, rules, stack, architecture, setup, conventions, workflow, people, quality, docs, tours, gotchas, todos, mission, cheatsheet (vazio = todos). paths: os subprojetos (path) da trilha (vazio = todos).",
  people:
    "Só preencha se esta seção existir no arquivo (o time pediu com `init --people`). Use `npx onboarding-kit facts --people`, que lista o CODEOWNERS e quem mais fez commits em cada área no último ano. Até 8 pessoas. name; role só se estiver documentado; areas: pastas ou subprojetos que a pessoa conhece; contact: canal do time ou @usuario do GitHub. NUNCA inclua e-mail, telefone ou dados pessoais.",
  firstTasks:
    "3 a 5 tarefas pequenas e seguras para alguém novo começar (ex.: um teste faltando, um TODO simples, uma melhoria de mensagem de erro), com os arquivos envolvidos.",
};

export interface TemplateOptions {
  framework: Framework;
  language?: string;
  /** Subprojetos detectados (detectSubprojects): entram pré-preenchidos e ganham dicas por framework. */
  subprojects?: Subproject[];
  /** Inclui a seção "Quem procurar" (people). Desligada por padrão: mostra nomes de pessoas. */
  people?: boolean;
}

/** Instruções extras para repositórios com vários projetos: um resumo e a dica de cada framework encontrado. */
function monorepoInstructions(framework: Framework, subprojects: Subproject[]) {
  const frameworks: Record<string, string> = {};
  for (const id of new Set(subprojects.map((s) => s.framework))) {
    if (id === framework) continue;
    const group = subprojects.filter((s) => s.framework === id);
    frameworks[`${group[0].frameworkLabel} (${group.map((s) => s.path).join(", ")})`] = FRAMEWORK_HINTS[id];
  }
  return {
    readme: `Este repositório tem ${subprojects.length} projetos (veja a seção subprojects). Explique primeiro como eles se encaixam (quem é app, quem é biblioteca compartilhada, quem depende de quem) e depois o que cada um faz. Caminhos em evidence continuam relativos à raiz do repositório (ex.: apps/web/src/page.tsx).`,
    frameworks,
  };
}

export function createTemplate({ framework, language = "pt-BR", subprojects = [], people = false }: TemplateOptions): OnboardingData {
  return {
    $schema: SCHEMA_URL,
    _instructions: {
      readme:
        "Você é a IA local deste projeto. Sua tarefa é preencher este arquivo analisando o código do repositório. O resultado será exibido em /onboarding para quem está chegando no projeto.",
      steps: [
        "1. Leia este arquivo inteiro antes de começar, incluindo _instructions.sections.",
        "2. Rode `npx onboarding-kit facts` para ver os fatos coletados do git e do código (branches, padrão dos commits, CI, hooks, testes, sinais de arquitetura, TODOs e observações em comentários). Depois explore o repositório: package.json (ou deno.json) e lockfile, README e docs, arquivos de config (tsconfig, eslint/biome, prettier, o config do framework e do bundler, docker, CI), código-fonte, testes e .env.example.",
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
        "Se meta.status já for \"filled\", você está ATUALIZANDO: rode `npx onboarding-kit status --fix` para ver quais itens citam arquivos que mudaram desde meta.commit (e corrigir as linhas que só andaram), revise apenas esses itens com `git diff <meta.commit> -- <arquivo>`, mantenha o restante e atualize meta.commit e meta.generatedAt.",
      ],
      framework: FRAMEWORK_HINTS[framework],
      ...(subprojects.length ? { monorepo: monorepoInstructions(framework, subprojects) } : {}),
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
    subprojects: subprojects.map((s) => ({
      name: s.name,
      path: s.path,
      kind: "",
      // "Vite (React, Vue, Svelte...)" vira "Vite · React"
      framework: [...new Set([s.frameworkLabel.replace(/\s*\(.*\)$/, ""), ...s.ui])].join(" · "),
      description: "",
      dependsOn: s.dependsOn,
      command: "",
    })),
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
    tracks: [],
    ...(people ? { people: [{ name: "", role: "", areas: [""], contact: "" }] } : {}),
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
