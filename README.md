# onboarding-kit

[![npm](https://img.shields.io/npm/v/onboarding-kit)](https://www.npmjs.com/package/onboarding-kit) · [Repositório no GitHub](https://github.com/LewixGenerator/onboard-kit) · [Reportar um problema](https://github.com/LewixGenerator/onboard-kit/issues)

Onboarding de projetos gerado pela **sua IA local** e exibido em `/onboarding`, dentro do próprio app.

1. O `onboarding-kit` cria um `onboarding.json` com todos os campos em branco e instruções para a IA.
2. Você pede para a IA que já usa no projeto (Claude Code, Cursor, Copilot…) ler e preencher o arquivo.
3. O `onboarding-kit` valida o resultado e mostra uma apresentação do projeto em `/onboarding`.

Funciona com **Next.js**, **NestJS** e **Node.js** (Express, http nativo e similares). Não tem dependências em runtime.

## Começando

```bash
npm i -D onboarding-kit
npx onboarding-kit init
```

O `init` detecta o framework e:

- **Next.js (App Router):** cria `app/onboarding/route.ts` (ou `src/app/...`).
- **NestJS:** adiciona `OnboardingModule.register()` em `src/app.module.ts`.
- **Node.js:** mostra o trecho para registrar a rota no seu servidor.

Depois, envie isto para a sua IA:

> Leia o arquivo onboarding.json e siga as instruções em "_instructions" para preenchê-lo com base neste repositório. No final, rode "npx onboarding-kit validate" e corrija o que ele apontar.

Para ver o resultado, abra `/onboarding` com o app rodando em dev, ou rode `npx onboarding-kit serve`.

Se você abrir `/onboarding` antes da IA terminar, a página mostra o prompt pronto para copiar, acompanha as seções conforme a IA preenche o arquivo e abre a apresentação sozinha quando ela termina. Sem `onboarding.json`, o prompt já pede para a IA rodar o `init` antes.

## Comandos

| Comando | O que faz |
|---|---|
| `init` | Cria o `onboarding.json` e liga a rota. Opções: `--framework`, `--lang`, `--no-route`, `--force` |
| `prompt` | Mostra o texto para enviar à IA |
| `facts` | Lista os fatos que a IA usa como base: branches, padrão dos commits recentes, CI, hooks, templates de PR, testes, sinais de arquitetura (monorepo, vários Dockerfiles, mensageria, pastas de camadas), TODOs e observações em comentários. `--json` para saída em JSON |
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

- **Cores:** `tailwind.config` (`brand`, `primary`, `accent`, inclusive `colors.indigo`), `@theme` do Tailwind v4, variáveis CSS como `--primary` e `--brand` (hex, rgb, hsl, o formato do shadcn/ui e oklch), variáveis SCSS/LESS, temas JS (`palette.primary.main`) e o `theme_color` do manifest.
- **Logo e favicon:** `public/`, `assets/`, `src/assets/` e `app/` (`logo.*`, `icon.*`, `favicon.*`). Os arquivos de exemplo do framework (`next.svg`, `vercel.svg`, `vite.svg`…) são ignorados.

Com uma cor, os capítulos variam em torno dela. Com várias, eles se revezam entre elas. Marcas em preto e branco viram um tema monocromático.

## O que vai no JSON

`project`, `business` (modelo de negócio, valor entregue, perfis e jornadas), `gettingStarted`, `stack`, `architecture` (com diagrama Mermaid), `conventions`, `domain` (glossário e regras de negócio), `features`, `tours` pelo código, `gotchas`, `decisions`, `firstTasks`, `workflow` (modelo de branches, padrão de commit com exemplos reais, processo de PR, ambientes de deploy), `quality` (como o time testa e o que roda na CI e nos hooks), `docs`, `codeNotes` (NOTE/IMPORTANT/WARNING/@deprecated relevantes), `todos` e `brand` (cores e logo). `architecture` também traz `style` (monolito, microsserviços, hexagonal…) e `patterns`.

Toda afirmação aponta para arquivos reais (`evidence: ["src/orders/orders.service.ts:42"]`). Quando `project.repoUrl` está preenchido, essas referências viram links para o código.

As chaves que começam com `_` (como `_instructions`) são só para a IA: a página as ignora. Deixe-as no arquivo, porque a IA usa essas instruções para **atualizar** o onboarding depois (com `git diff` desde `meta.commit`).

## Uso manual dos adapters

```ts
// Next.js — app/onboarding/route.ts
import { createOnboardingRoute } from "onboarding-kit/next";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = createOnboardingRoute();

// Next.js Pages Router — pages/api/onboarding.ts (+ rewrite de /onboarding)
import { createOnboardingApiHandler } from "onboarding-kit/next";
export default createOnboardingApiHandler();

// NestJS — app.module.ts (com globalPrefix "api", a rota fica /api/onboarding)
import { OnboardingModule } from "onboarding-kit/nest";
@Module({ imports: [OnboardingModule.register({ path: "onboarding" })] })

// Express / Node
import { createOnboardingHandler } from "onboarding-kit/node";
app.get("/onboarding", createOnboardingHandler());
```

Todos os adapters aceitam `{ file?: string; enabled?: boolean }`.

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
