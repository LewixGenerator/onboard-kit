<div align="center">

# onboarding-kit

**O onboarding do seu projeto, escrito pela sua IA e apresentado em `/onboarding`.**

[![npm version](https://img.shields.io/npm/v/onboarding-kit?color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/onboarding-kit)
[![npm downloads](https://img.shields.io/npm/dm/onboarding-kit?color=0b7285&logo=npm&label=downloads)](https://www.npmjs.com/package/onboarding-kit)
[![CI](https://github.com/LewixGenerator/onboard-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/LewixGenerator/onboard-kit/actions/workflows/ci.yml)
[![onboarding coverage](https://img.shields.io/endpoint?url=https://lewixgenerator.github.io/onboard-kit/badge.json)](https://lewixgenerator.github.io/onboard-kit/)
[![license](https://img.shields.io/npm/l/onboarding-kit?color=2f9e44)](LICENSE)
[![node](https://img.shields.io/node/v/onboarding-kit?logo=node.js&logoColor=white&color=339933)](https://nodejs.org)
[![types](https://img.shields.io/npm/types/onboarding-kit?logo=typescript&logoColor=white&color=3178c6)](https://www.typescriptlang.org)
[![zero dependencies](https://img.shields.io/badge/dependências-0-2f9e44)](package.json)
[![install size](https://packagephobia.com/badge?p=onboarding-kit)](https://packagephobia.com/result?p=onboarding-kit)

[![Claude Code](https://img.shields.io/badge/Claude_Code-pronto-d97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![Cursor](https://img.shields.io/badge/Cursor-pronto-000000?logo=cursor&logoColor=white)](https://cursor.com)
[![GitHub Copilot](https://img.shields.io/badge/Copilot-pronto-24292f?logo=githubcopilot&logoColor=white)](https://github.com/features/copilot)
[![PRs welcome](https://img.shields.io/badge/PRs-bem--vindos-ff69b4)](https://github.com/LewixGenerator/onboard-kit/pulls)
[![GitHub stars](https://img.shields.io/github/stars/LewixGenerator/onboard-kit?style=social)](https://github.com/LewixGenerator/onboard-kit)

<br>

![Next.js](https://img.shields.io/badge/Next.js-000?logo=nextdotjs&logoColor=white)
![Nuxt](https://img.shields.io/badge/Nuxt-00DC82?logo=nuxt&logoColor=white)
![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-BC52EE?logo=astro&logoColor=white)
![Remix](https://img.shields.io/badge/Remix_/_React_Router-000?logo=reactrouter&logoColor=white)
![Gatsby](https://img.shields.io/badge/Gatsby-663399?logo=gatsby&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)
![AdonisJS](https://img.shields.io/badge/AdonisJS-5A45FF?logo=adonisjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000?logo=express&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000?logo=fastify&logoColor=white)
![Koa](https://img.shields.io/badge/Koa-33333D?logo=koa&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white)
![Elysia](https://img.shields.io/badge/Elysia-8B5CF6?logo=bun&logoColor=white)
<br>
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Vue](https://img.shields.io/badge/Vue-4FC08D?logo=vuedotjs&logoColor=white)
![Svelte](https://img.shields.io/badge/Svelte-FF3E00?logo=svelte&logoColor=white)
![Solid](https://img.shields.io/badge/Solid-2C4F7C?logo=solid&logoColor=white)
![Preact](https://img.shields.io/badge/Preact-673AB8?logo=preact&logoColor=white)
![Qwik](https://img.shields.io/badge/Qwik-AC7EF4?logo=qwik&logoColor=white)
![Lit](https://img.shields.io/badge/Lit-324FFF?logo=lit&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?logo=angular&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native_/_Expo-000020?logo=expo&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?logo=electron&logoColor=white)
<br>
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000?logo=bun&logoColor=white)
![Deno](https://img.shields.io/badge/Deno-000?logo=deno&logoColor=white)

**[Ver a demo](https://lewixgenerator.github.io/onboard-kit/)** · [English](README.en.md) · [Repositório no GitHub](https://github.com/LewixGenerator/onboard-kit) · [npm](https://www.npmjs.com/package/onboarding-kit) · [Reportar um problema](https://github.com/LewixGenerator/onboard-kit/issues)

</div>

---

Onboarding de projetos gerado pela **sua IA local** e exibido em `/onboarding`, dentro do próprio app.

1. O `onboarding-kit` cria um `onboarding.json` com todos os campos em branco e instruções para a IA.
2. Você pede para a IA que já usa no projeto (Claude Code, Cursor, Copilot…) ler e preencher o arquivo.
3. O `onboarding-kit` valida o resultado e mostra uma apresentação do projeto em `/onboarding`.

Funciona em praticamente qualquer projeto do ecossistema JavaScript: metaframeworks, servidores HTTP, SPAs com Vite, apps mobile e desktop, bibliotecas e CLIs, em **Node.js, Bun ou Deno**, escritos em TypeScript, JavaScript ou linguagens que compilam para JS. Não tem dependências em runtime.

## Começando

```bash
npm i -D onboarding-kit
npx onboarding-kit init
```

O `init` detecta o framework e liga a rota `/onboarding` do jeito nativo de cada um:

| Projeto | O que o `init` faz |
|---|---|
| **Next.js** (App Router) | cria `app/onboarding/route.ts` (ou `src/app/...`); no Pages Router mostra o trecho |
| **Nuxt** | cria `server/routes/onboarding.ts` |
| **SvelteKit** | cria `src/routes/onboarding/+server.ts` |
| **NestJS** | adiciona `OnboardingModule.register()` em `src/app.module.ts` |
| **Vite** (React, Vue, Svelte, Solid, Preact, Qwik, Lit) e **React Router 7 / Remix** | adiciona o plugin `onboarding()` no `vite.config` |
| **Create React App** | cria `src/setupProxy.js` |
| **Astro, Gatsby, Express, Fastify, Koa, Hono, Elysia, AdonisJS, Webpack/Vue CLI** | mostra o trecho de 2 ou 3 linhas para colar |
| **Angular, React Native/Expo, Electron, bibliotecas e CLIs** | só o script abaixo |

Em todos os casos, o `init` também adiciona o script `onboarding` ao `package.json` (`npm run onboarding`, `pnpm onboarding`…), que abre a apresentação em `localhost:4321` sem precisar subir o app. Use `--no-script` para pular.

No terminal, o `init` pergunta em que idioma você quer o onboarding (Enter = português). Para pular a pergunta, use `--lang pt` ou `--lang en`. Toda a CLI fala português por padrão; `--lang en` ou `ONBOARDING_KIT_LANG=en` troca para inglês.

Se a detecção errar, force com `--framework <id>`: `next`, `nuxt`, `sveltekit`, `astro`, `remix`, `gatsby`, `nest`, `adonis`, `express`, `fastify`, `koa`, `hono`, `elysia`, `angular`, `vite`, `cra`, `webpack`, `react-native`, `electron`, `library` ou `node`. Projetos Deno sem `package.json` são lidos pelo `deno.json`.

Depois, envie isto para a sua IA:

> Leia o arquivo onboarding.json e siga as instruções em "_instructions" para preenchê-lo com base neste repositório. No final, rode "npx onboarding-kit validate" e corrija o que ele apontar.

Para ver o resultado, abra `/onboarding` com o app rodando em dev, ou rode `npx onboarding-kit serve`.

Prefere não copiar e colar? `npx onboarding-kit init --ai` roda o Claude Code, o Codex ou o Gemini CLI instalado com o prompt e valida no final (`--ai codex` para escolher).

Se você abrir `/onboarding` antes da IA terminar, a página mostra o prompt pronto para copiar, acompanha as seções conforme a IA preenche o arquivo e abre a apresentação sozinha quando ela termina. Sem `onboarding.json`, o prompt já pede para a IA rodar o `init` antes.

## Comandos

| Comando | O que faz |
|---|---|
| `init` | Cria o `onboarding.json` e liga a rota. Opções: `--framework`, `--lang`, `--project` (monorepo), `--people`, `--ai`, `--no-route`, `--no-script`, `--force` |
| `prompt` | Mostra o texto para enviar à IA |
| `facts` | Lista os fatos que a IA usa como base: framework, UI, runtime e linguagens do repositório, branches, padrão dos commits recentes, CI, hooks, templates de PR, testes, subprojetos do monorepo (framework e dependências internas de cada um), sinais de arquitetura (monorepo, vários Dockerfiles, mensageria, pastas de camadas), TODOs e observações em comentários. `--project <pasta>` mostra os fatos de um subprojeto só; `--people` inclui CODEOWNERS e autores por área; `--json` para saída em JSON |
| `validate` | Confere campos obrigatórios, itens-modelo esquecidos, se as evidências existem, se há segredos, textos longos demais para um slide, itens repetidos, erros comuns de Mermaid, subprojetos esquecidos e se o JSON está atrás do commit atual. Sai com código 1 em caso de erro. `--ci` gera anotações no GitHub Actions (automático lá dentro) e `--strict` trata avisos como erros. Mostra a nota de cobertura; `--min-score 70` falha abaixo dela e `--badge badge.json` grava o JSON de um badge do shields.io |
| `status` | Compara o código com o commit em que o onboarding foi gerado: aponta os itens que citam arquivos que mudaram, evidências apagadas, arquivos novos que ninguém cita e monta o prompt para a IA atualizar só isso. `--fix` corrige sozinho as evidências que só mudaram de linha ou de arquivo, `--ai` manda o prompt direto para a IA instalada. Também lista o feedback deixado nos slides |
| `agents` | Ensina sua IA a manter o onboarding em dia: adiciona um trecho ao `AGENTS.md` (e ao `CLAUDE.md` e `.github/copilot-instructions.md`, se existirem), cria o comando `/onboarding` do Claude Code e a regra do Cursor |
| `mcp` | Servidor MCP (stdio) com as ferramentas `onboarding_facts`, `onboarding_status`, `onboarding_validate` e outras, para a IA receber JSON em vez de ler o terminal |
| `serve` | Abre a apresentação em `http://localhost:4321` (`--port` para mudar). Mostra o projeto, os números do deck, a cobertura e as trilhas, e avisa no terminal cada vez que a IA grava o `onboarding.json` |
| `translate` | Traduz o onboarding para o outro idioma sem reler o código: `--to en` grava em `onboarding.en.todo.json` só os textos novos ou alterados desde a última tradução, a IA traduz esse arquivo e o próximo `translate` guarda o resultado em `onboarding.en.json`. `--ai` faz tudo com a IA instalada |
| `review` | Registra que alguém do time conferiu um capítulo: `review rules --by Ana` (ids dos capítulos em inglês: `rules`, `architecture`, `executive`…). A apresentação mostra "Revisado por Ana em…" e o `status` avisa quando o código daquele capítulo muda depois. Sem argumentos, lista as revisões |
| `export` | Gera um HTML único e estático da apresentação (`--out`, padrão `onboarding.html`), para GitHub Pages, intranet ou anexo. `--offline` embute o Mermaid e as fontes; cada trilha vira um arquivo ao lado (`onboarding.frontend.html`), e cada idioma traduzido também (`onboarding.en.html`) |

## Mantendo o onboarding em dia

Cada afirmação do `onboarding.json` aponta para arquivos reais, e `meta.commit` guarda o commit analisado. Com isso, o `status` sabe exatamente o que envelheceu:

```bash
npx onboarding-kit status        # o que mudou e o prompt para a IA
npx onboarding-kit status --fix  # corrige evidências que só mudaram de linha ou foram renomeadas
```

Rode `npx onboarding-kit agents` uma vez para a sua IA fazer isso sozinha depois de mudanças grandes.

Na CI, este workflow anota no PR as evidências quebradas e mostra no resumo do job o que pode estar desatualizado:

```yaml
# .github/workflows/onboarding.yml
name: Onboarding
on: pull_request
jobs:
  onboarding:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0 # o status precisa do histórico até meta.commit
      - uses: actions/setup-node@v7
        with:
          node-version: 22
      - run: npx onboarding-kit validate
      - run: npx onboarding-kit status
```

### Servidor MCP

Com o MCP, a IA chama `facts`, `status`, `validate`, a correção de evidências e a tradução (`onboarding_translate`) como ferramentas e recebe JSON estruturado:

```bash
claude mcp add onboarding-kit -- npx onboarding-kit mcp
```

No Cursor e em outros clientes, configure um servidor stdio com o comando `npx onboarding-kit mcp`.

O `onboarding.json` aponta para um JSON Schema (`$schema`), então o editor e a IA ganham autocomplete e validação enquanto escrevem.

## A apresentação

A página `/onboarding` é um tour em slides, contado do ponto de vista de quem acabou de ser contratado: boas-vindas → o porquê → o negócio → o produto → visão executiva → vocabulário (com cartões que viram e um quiz) → regras do jogo → stack → arquitetura (estilo, padrões, diagrama, pastas e decisões) → rodando na máquina → jeito da casa → Git e fluxo (branches, commits, PR e deploy) → qualidade (testes e verificações automáticas) → leitura obrigatória (docs e recados deixados no código) → tour pelo código → cuidados → TODOs → perguntas em aberto → primeira missão → cola do dia a dia → final.

Os TODOs são contados direto do código a cada visita, então o número nunca fica desatualizado. A IA escolhe só os que importam para quem está chegando e explica o impacto de cada um.

Para não sobrecarregar, cada seção tem um limite de itens (o `validate` avisa quando passa) e capítulos sem conteúdo não aparecem.

Os capítulos entram com uma cortina animada, os elementos aparecem em cascata, o fundo muda de cor junto com o capítulo e os cartões inclinam com o mouse. Tudo isso é desligado quando o sistema pede movimento reduzido.

Navegação por ← →, espaço, swipe no celular ou pelos segmentos coloridos no topo. `O` abre o índice. O progresso e as tarefas marcadas ficam salvos no navegador. Tem tema claro e escuro. Capítulos sem conteúdo são pulados e listas longas viram vários slides.

Cada slide tem um link direto, para mandar a parte certa para quem pergunta: `/onboarding#/arquitetura`, `/onboarding#/arquitetura/2`. O botão **Imprimir / PDF** (no índice e no final) gera um slide por página. A interface da apresentação fala português, inglês e espanhol, conforme `meta.language`.

- **Português ou inglês:** o seletor PT | EN no topo troca o idioma (`/onboarding?lang=en`). O que já foi traduzido com `translate` aparece no outro idioma; o que falta fica no original, com um aviso e o comando para traduzir. Como a tradução é incremental, a IA só traduz o que mudou, sem gastar tokens relendo o projeto.
- **Visão executiva:** para P.O., CTO e gestão. Um painel calculado direto do git e dos arquivos, sem IA: ritmo de entregas, atividade, concentração de conhecimento (quantas pessoas fazem 80% dos commits), dívida técnica por mil linhas, testes e cobertura, dependências e licenças. Depois, as integrações externas (detectadas pelas dependências e arquivos de infra, com o papel de cada uma escrito pela IA), os 3 maiores riscos e as áreas que mais mudam. A trilha **gestão** (`?trilha=gestao`) vem pronta e mostra só negócio, produto, visão executiva, arquitetura, fluxo, qualidade, TODOs e perguntas em aberto.
- **Perguntas em aberto:** o que a IA não conseguiu confirmar no código vira pergunta para o time, em vez de chute.
- **Confiança:** itens deduzidos (`confidence: "inferred"`) aparecem marcados como "deduzido" e valem menos na nota de cobertura.

- **Busca:** `Ctrl/Cmd+K` ou `/` procura em todos os slides, sem diferenciar acentos.
- **Trechos de código:** os passos do tour, as regras de negócio e os cuidados mostram as linhas citadas na evidência (`arquivo.ts:42`), com a linha destacada.
- **Trilhas por papel:** com `tracks` preenchido, a abertura oferece trilhas como frontend, backend ou QA, cada uma com só os capítulos e subprojetos que interessam: `/onboarding?trilha=frontend`.
- **O que mudou desde a última visita:** quem volta vê a lista do que entrou ou mudou no onboarding desde a versão que leu, montada a partir do histórico do `onboarding.json` no git.
- **Ficou confuso?** Cada slide tem um botão para deixar um comentário. Eles ficam em `onboarding-feedback.json`, ao lado do onboarding, e o `status` os entrega para a IA melhorar aqueles trechos. Desligue com `feedback: false`.
- **Quem procurar:** opcional. Com `init --people`, a IA preenche `people` com quem conhece cada área, a partir do CODEOWNERS e dos autores dos commits. Só nome, papel e canal: o `validate` recusa e-mail e telefone.

## Cara da marca

A apresentação usa as cores e o logo do projeto. A IA preenche `brand` (`primaryColor`, `palette`, `logo`, `favicon`) e o que ficar vazio é detectado automaticamente:

- **Cores:** `tailwind.config` (`brand`, `primary`, `accent`, inclusive `colors.indigo`), `@theme` do Tailwind v4, UnoCSS, Panda, variáveis CSS como `--primary` e `--brand` (hex, rgb, hsl, o formato do shadcn/ui e oklch), SCSS/LESS/Stylus, temas JS (MUI, Chakra, Vuetify, Quasar, `app.config` do Nuxt UI), blocos `<style>` de `App.vue`, `+layout.svelte` e `Layout.astro`, o `primaryColor` do Expo e o `theme_color` do manifest.
- **Logo e favicon:** `public/`, `static/`, `assets/`, `src/assets/`, `src/lib/assets/`, `app/`, `resources/` e `src-tauri/icons/` (`logo.*`, `icon.*`, `favicon.*`). Os arquivos de exemplo dos frameworks (`next.svg`, `vite.svg`, `nuxt.svg`, `astro.svg`, `svelte.svg`…) são ignorados.

Com uma cor, os capítulos variam em torno dela. Com várias, eles se revezam entre elas. Marcas em preto e branco viram um tema monocromático.

## O que vai no JSON

`project`, `business` (modelo de negócio, valor entregue, perfis e jornadas), `gettingStarted`, `stack`, `architecture` (com diagrama Mermaid), `conventions`, `domain` (glossário e regras de negócio), `features`, `tours` pelo código, `gotchas`, `decisions`, `firstTasks`, `workflow` (modelo de branches, padrão de commit com exemplos reais, processo de PR, ambientes de deploy), `quality` (como o time testa e o que roda na CI e nos hooks), `docs`, `codeNotes` (NOTE/IMPORTANT/WARNING/@deprecated relevantes), `todos`, `subprojects` (projetos do monorepo), `tracks` (trilhas por papel), `people` (opcional), `executive` (resumo, riscos e integrações), `openQuestions`, `reviews` e `brand` (cores e logo). `architecture` também traz `style` (monolito, microsserviços, hexagonal…) e `patterns`.

Toda afirmação aponta para arquivos reais (`evidence: ["src/orders/orders.service.ts:42"]`). Quando `project.repoUrl` está preenchido, essas referências viram links para o código. O `validate` confere também se as linhas citadas falam do que o texto diz: se a descrição menciona `` `calcularFrete` `` e o nome não aparece perto da linha da evidência, ele avisa.

As chaves que começam com `_` (como `_instructions`) são só para a IA: a página as ignora. Deixe-as no arquivo, porque a IA usa essas instruções para **atualizar** o onboarding depois (com `git diff` desde `meta.commit`).

### Monorepos e vários projetos

O `init` e o `facts` reconhecem repositórios com mais de um projeto: workspaces do npm, Yarn, Bun e pnpm (`pnpm-workspace.yaml`), Lerna, Rush e Deno, com Turborepo e Nx identificados junto. Sem workspace declarado, pastas com `package.json` ou `deno.json` próprio (como `frontend/` e `backend/`) também contam. Para cada subprojeto o kit detecta o framework, a biblioteca de UI, se é um app ou um pacote consumido pelos outros e as dependências internas.

O `onboarding.json` já nasce com a seção `subprojects` pré-preenchida (nome, pasta, framework e `dependsOn`) e com as dicas de cada framework encontrado em `_instructions.monorepo`. A IA completa `kind`, `description` e `command` (ex.: `pnpm --filter web dev`), e a apresentação ganha um slide no capítulo de arquitetura com o que cada projeto faz e quem depende de quem. O `validate` confere se as pastas existem e se o `dependsOn` aponta para subprojetos listados.

No monorepo, o `init` cria a rota `/onboarding` dentro do primeiro web app que encontrar (Next, Nuxt, SvelteKit, Vite...) apontando para o `onboarding.json` da raiz, diz como instalar o kit naquele app e adiciona `npm run onboarding` na raiz. Para escolher outro app, use `--project apps/admin` (pasta ou nome). O `facts --project apps/api` mostra os fatos de um subprojeto só, os TODOs aparecem agrupados por subprojeto e a apresentação desenha sozinha o diagrama de quem depende de quem.

## Uso manual dos adapters

| Import | Para |
|---|---|
| `onboarding-kit/next` | Next.js (App Router e Pages Router) |
| `onboarding-kit/nest` | NestJS |
| `onboarding-kit/vite` | qualquer projeto com Vite, inclusive Astro e React Router 7 |
| `onboarding-kit/fetch` | tudo que fala `Request → Response`: Nuxt/h3, SvelteKit, Remix, Hono, Elysia, AdonisJS, Bun.serve, Deno.serve |
| `onboarding-kit/fastify` | Fastify |
| `onboarding-kit/koa` | Koa |
| `onboarding-kit/express` / `onboarding-kit/node` | Express, Connect, Polka, http nativo, dev servers do Webpack e do Gatsby |

```ts
// Next.js: app/onboarding/route.ts
import { createOnboardingRoute } from "onboarding-kit/next";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createOnboardingRoute();
export const POST = GET;

// NestJS: app.module.ts (com globalPrefix "api", a rota fica /api/onboarding)
import { OnboardingModule } from "onboarding-kit/nest";
@Module({ imports: [OnboardingModule.register({ path: "onboarding" })] })

// Vite (React, Vue, Svelte, Solid, Preact, Qwik, Lit, React Router 7): vite.config.ts
import { onboarding } from "onboarding-kit/vite";
export default defineConfig({ plugins: [onboarding(), react()] });

// Astro: astro.config.mjs
export default defineConfig({ vite: { plugins: [onboarding()] } });

// Nuxt: server/routes/onboarding.ts
import { createOnboardingFetchHandler } from "onboarding-kit/fetch";
const onboarding = createOnboardingFetchHandler();
export default defineEventHandler((event) => onboarding(toWebRequest(event)));

// SvelteKit: src/routes/onboarding/+server.ts
export const GET = createOnboardingFetchHandler();
export const POST = GET;

// Remix: app/routes/onboarding.ts
export const loader = createOnboardingFetchHandler();
export const action = loader;

// Hono / Elysia
app.all("/onboarding", (c) => onboarding(c.req.raw));

// Bun.serve / Deno.serve
Bun.serve({ fetch: (req) => new URL(req.url).pathname === "/onboarding" ? onboarding(req) : seuHandler(req) });

// Fastify
import { fastifyOnboarding } from "onboarding-kit/fastify";
app.register(fastifyOnboarding);

// Koa
import { createOnboardingMiddleware } from "onboarding-kit/koa";
app.use(createOnboardingMiddleware());

// Express
import { createOnboardingHandler } from "onboarding-kit/express";
app.all("/onboarding", createOnboardingHandler());
```

Todos os adapters aceitam `{ file?: string; enabled?: boolean; password?: string; feedback?: boolean }`; os de Vite, Fastify, Koa e Nest também aceitam `path`. Os handlers recebem a requisição para ler a trilha da URL, e o `POST` na mesma rota guarda o feedback dos slides. O plugin do Vite só roda no `vite dev`, nunca entra no build.

Em projetos sem servidor web (apps mobile, desktop, bibliotecas), use `npx onboarding-kit serve`.

## Linguagens

O `facts` e a varredura de TODOs entendem os arquivos do universo JavaScript: TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`), JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`), Vue, Svelte, Astro, MDX, Marko, Glimmer/Ember (`.gjs`, `.gts`), Handlebars, EJS, Pug, Nunjucks, Liquid, CoffeeScript, ReScript, Reason, Elm, PureScript, ClojureScript, Civet e Imba, além de CSS, SCSS, Sass, Less, Stylus, GraphQL, Prisma e SQL. Em monorepos poliglotas, Python, Go, Rust, Ruby, Java, Kotlin, PHP, C#, Swift e Dart também entram na conta.

## Segurança

- A rota fica **desligada quando `NODE_ENV=production`**. Para ligar de propósito, passe `enabled: true`.
- Com `ONBOARDING_PASSWORD` (ou `password`), a rota pede senha (HTTP Basic, qualquer usuário) e fica disponível também em produção. Útil para publicar em staging.
- O feedback só aceita `application/json`, o que impede envios a partir de formulários de outros sites.
- A página envia `noindex` e não usa cache.
- O `validate` procura tokens, chaves privadas, JWTs e URLs com senha.
- Todo o conteúdo do JSON passa por escape antes de entrar no HTML.

## Desenvolvimento

```bash
npm install
npm test           # compila e roda os testes
npm run test:e2e   # testa o deck exportado no Chromium (Playwright); PW_CHANNEL=chrome usa o Chrome instalado
node dist/cli/index.js serve   # mostra o onboarding do próprio onboarding-kit
```

A CI roda os testes no Node 18, 20 e 22 e também no Windows e no macOS, mais os testes de navegador. A cada push na `master`, o workflow `pages.yml` publica a [demo](https://lewixgenerator.github.io/onboard-kit/) (o onboarding do próprio kit) e o badge de cobertura.

As mensagens da CLI e o conteúdo gerado são em português por padrão. Para inglês, use `--lang en` no `init` ou `ONBOARDING_KIT_LANG=en`.

### Publicação

As versões são publicadas pelo GitHub Actions ao enviar uma tag, com [Trusted Publishing](https://docs.npmjs.com/trusted-publishers) e provenance (sem token nem OTP):

```bash
npm version minor   # atualiza o package.json e cria a tag vX.Y.0
git push --follow-tags
```

Configuração única no npmjs.com: **onboarding-kit → Settings → Trusted Publisher → GitHub Actions**, repositório `LewixGenerator/onboard-kit`, workflow `publish.yml`.

## Licença

[MIT](LICENSE)
