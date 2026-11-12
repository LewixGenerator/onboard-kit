<div align="center">

# onboarding-kit

**O onboarding do seu projeto, escrito pela sua IA e apresentado em `/onboarding`.**

[![npm version](https://img.shields.io/npm/v/onboarding-kit?color=cb3837&logo=npm&label=npm)](https://www.npmjs.com/package/onboarding-kit)
[![npm downloads](https://img.shields.io/npm/dm/onboarding-kit?color=0b7285&logo=npm&label=downloads)](https://www.npmjs.com/package/onboarding-kit)
[![CI](https://github.com/LewixGenerator/onboard-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/LewixGenerator/onboard-kit/actions/workflows/ci.yml)
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

[Repositório no GitHub](https://github.com/LewixGenerator/onboard-kit) · [npm](https://www.npmjs.com/package/onboarding-kit) · [Reportar um problema](https://github.com/LewixGenerator/onboard-kit/issues)

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
| **Nuxt** | cria `server/routes/onboarding.get.ts` |
| **SvelteKit** | cria `src/routes/onboarding/+server.ts` |
| **NestJS** | adiciona `OnboardingModule.register()` em `src/app.module.ts` |
| **Vite** (React, Vue, Svelte, Solid, Preact, Qwik, Lit) e **React Router 7 / Remix** | adiciona o plugin `onboarding()` no `vite.config` |
| **Create React App** | cria `src/setupProxy.js` |
| **Astro, Gatsby, Express, Fastify, Koa, Hono, Elysia, AdonisJS, Webpack/Vue CLI** | mostra o trecho de 2 ou 3 linhas para colar |
| **Angular, React Native/Expo, Electron, bibliotecas e CLIs** | adiciona o script `npm run onboarding`, que abre a apresentação em `localhost:4321` |

Se a detecção errar, force com `--framework <id>`: `next`, `nuxt`, `sveltekit`, `astro`, `remix`, `gatsby`, `nest`, `adonis`, `express`, `fastify`, `koa`, `hono`, `elysia`, `angular`, `vite`, `cra`, `webpack`, `react-native`, `electron`, `library` ou `node`. Projetos Deno sem `package.json` são lidos pelo `deno.json`.

Depois, envie isto para a sua IA:

> Leia o arquivo onboarding.json e siga as instruções em "_instructions" para preenchê-lo com base neste repositório. No final, rode "npx onboarding-kit validate" e corrija o que ele apontar.

Para ver o resultado, abra `/onboarding` com o app rodando em dev, ou rode `npx onboarding-kit serve`.

Se você abrir `/onboarding` antes da IA terminar, a página mostra o prompt pronto para copiar, acompanha as seções conforme a IA preenche o arquivo e abre a apresentação sozinha quando ela termina. Sem `onboarding.json`, o prompt já pede para a IA rodar o `init` antes.

## Comandos

| Comando | O que faz |
|---|---|
| `init` | Cria o `onboarding.json` e liga a rota. Opções: `--framework`, `--lang`, `--no-route`, `--force` |
| `prompt` | Mostra o texto para enviar à IA |
| `facts` | Lista os fatos que a IA usa como base: framework, UI, runtime e linguagens do repositório, branches, padrão dos commits recentes, CI, hooks, templates de PR, testes, sinais de arquitetura (monorepo, vários Dockerfiles, mensageria, pastas de camadas), TODOs e observações em comentários. `--json` para saída em JSON |
| `validate` | Confere campos obrigatórios, itens-modelo esquecidos, se as evidências existem, se há segredos e se o JSON está atrás do commit atual. Sai com código 1 em caso de erro (útil na CI) |
| `serve` | Abre a apresentação em `http://localhost:4321` (`--port` para mudar) |

## A apresentação

A página `/onboarding` é um tour em slides, contado do ponto de vista de quem acabou de ser contratado: boas-vindas → o porquê → o negócio → o produto → vocabulário (com cartões que viram e um quiz) → regras do jogo → stack → arquitetura (estilo, padrões, diagrama, pastas e decisões) → rodando na máquina → jeito da casa → Git e fluxo (branches, commits, PR e deploy) → qualidade (testes e verificações automáticas) → leitura obrigatória (docs e recados deixados no código) → tour pelo código → cuidados → TODOs → primeira missão → cola do dia a dia → final.

Os TODOs são contados direto do código a cada visita, então o número nunca fica desatualizado. A IA escolhe só os que importam para quem está chegando e explica o impacto de cada um.

Para não sobrecarregar, cada seção tem um limite de itens (o `validate` avisa quando passa) e capítulos sem conteúdo não aparecem.

Os capítulos entram com uma cortina animada, os elementos aparecem em cascata, o fundo muda de cor junto com o capítulo e os cartões inclinam com o mouse. Tudo isso é desligado quando o sistema pede movimento reduzido.

Navegação por ← →, espaço, swipe no celular ou pelos segmentos coloridos no topo. `O` abre o índice. O progresso e as tarefas marcadas ficam salvos no navegador. Tem tema claro e escuro. Capítulos sem conteúdo são pulados e listas longas viram vários slides.

## Cara da marca

A apresentação usa as cores e o logo do projeto. A IA preenche `brand` (`primaryColor`, `palette`, `logo`, `favicon`) e o que ficar vazio é detectado automaticamente:

- **Cores:** `tailwind.config` (`brand`, `primary`, `accent`, inclusive `colors.indigo`), `@theme` do Tailwind v4, UnoCSS, Panda, variáveis CSS como `--primary` e `--brand` (hex, rgb, hsl, o formato do shadcn/ui e oklch), SCSS/LESS/Stylus, temas JS (MUI, Chakra, Vuetify, Quasar, `app.config` do Nuxt UI), blocos `<style>` de `App.vue`, `+layout.svelte` e `Layout.astro`, o `primaryColor` do Expo e o `theme_color` do manifest.
- **Logo e favicon:** `public/`, `static/`, `assets/`, `src/assets/`, `src/lib/assets/`, `app/`, `resources/` e `src-tauri/icons/` (`logo.*`, `icon.*`, `favicon.*`). Os arquivos de exemplo dos frameworks (`next.svg`, `vite.svg`, `nuxt.svg`, `astro.svg`, `svelte.svg`…) são ignorados.

Com uma cor, os capítulos variam em torno dela. Com várias, eles se revezam entre elas. Marcas em preto e branco viram um tema monocromático.

## O que vai no JSON

`project`, `business` (modelo de negócio, valor entregue, perfis e jornadas), `gettingStarted`, `stack`, `architecture` (com diagrama Mermaid), `conventions`, `domain` (glossário e regras de negócio), `features`, `tours` pelo código, `gotchas`, `decisions`, `firstTasks`, `workflow` (modelo de branches, padrão de commit com exemplos reais, processo de PR, ambientes de deploy), `quality` (como o time testa e o que roda na CI e nos hooks), `docs`, `codeNotes` (NOTE/IMPORTANT/WARNING/@deprecated relevantes), `todos` e `brand` (cores e logo). `architecture` também traz `style` (monolito, microsserviços, hexagonal…) e `patterns`.

Toda afirmação aponta para arquivos reais (`evidence: ["src/orders/orders.service.ts:42"]`). Quando `project.repoUrl` está preenchido, essas referências viram links para o código.

As chaves que começam com `_` (como `_instructions`) são só para a IA: a página as ignora. Deixe-as no arquivo, porque a IA usa essas instruções para **atualizar** o onboarding depois (com `git diff` desde `meta.commit`).

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

// NestJS: app.module.ts (com globalPrefix "api", a rota fica /api/onboarding)
import { OnboardingModule } from "onboarding-kit/nest";
@Module({ imports: [OnboardingModule.register({ path: "onboarding" })] })

// Vite (React, Vue, Svelte, Solid, Preact, Qwik, Lit, React Router 7): vite.config.ts
import { onboarding } from "onboarding-kit/vite";
export default defineConfig({ plugins: [onboarding(), react()] });

// Astro: astro.config.mjs
export default defineConfig({ vite: { plugins: [onboarding()] } });

// Nuxt: server/routes/onboarding.get.ts
import { createOnboardingFetchHandler } from "onboarding-kit/fetch";
const onboarding = createOnboardingFetchHandler();
export default defineEventHandler(() => onboarding());

// SvelteKit: src/routes/onboarding/+server.ts
export const GET = createOnboardingFetchHandler();

// Remix: app/routes/onboarding.ts
export const loader = createOnboardingFetchHandler();

// Hono / Elysia
app.get("/onboarding", () => onboarding());

// Bun.serve / Deno.serve
Bun.serve({ fetch: (req) => new URL(req.url).pathname === "/onboarding" ? onboarding() : seuHandler(req) });

// Fastify
import { fastifyOnboarding } from "onboarding-kit/fastify";
app.register(fastifyOnboarding);

// Koa
import { createOnboardingMiddleware } from "onboarding-kit/koa";
app.use(createOnboardingMiddleware());

// Express
import { createOnboardingHandler } from "onboarding-kit/express";
app.get("/onboarding", createOnboardingHandler());
```

Todos os adapters aceitam `{ file?: string; enabled?: boolean }`; os de Vite, Fastify, Koa e Nest também aceitam `path`. O plugin do Vite só roda no `vite dev`, nunca entra no build.

Em projetos sem servidor web (apps mobile, desktop, bibliotecas), use `npx onboarding-kit serve`.

## Linguagens

O `facts` e a varredura de TODOs entendem os arquivos do universo JavaScript: TypeScript (`.ts`, `.tsx`, `.mts`, `.cts`), JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`), Vue, Svelte, Astro, MDX, Marko, Glimmer/Ember (`.gjs`, `.gts`), Handlebars, EJS, Pug, Nunjucks, Liquid, CoffeeScript, ReScript, Reason, Elm, PureScript, ClojureScript, Civet e Imba, além de CSS, SCSS, Sass, Less, Stylus, GraphQL, Prisma e SQL. Em monorepos poliglotas, Python, Go, Rust, Ruby, Java, Kotlin, PHP, C#, Swift e Dart também entram na conta.

## Segurança

- A rota fica **desligada quando `NODE_ENV=production`**. Para ligar de propósito, passe `enabled: true`.
- A página envia `noindex` e não usa cache.
- O `validate` procura tokens, chaves privadas, JWTs e URLs com senha.
- Todo o conteúdo do JSON passa por escape antes de entrar no HTML.

## Desenvolvimento

```bash
npm install
npm test        # compila e roda os testes
node dist/cli/index.js serve   # mostra o onboarding do próprio onboarding-kit
```

## Licença

[MIT](LICENSE)
