# onboarding-kit

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

## Comandos

| Comando | O que faz |
|---|---|
| `init` | Cria o `onboarding.json` e liga a rota. Opções: `--framework`, `--lang`, `--no-route`, `--force` |
| `prompt` | Mostra o texto para enviar à IA |
| `validate` | Confere campos obrigatórios, itens-modelo esquecidos, se as evidências existem, se há segredos e se o JSON está atrás do commit atual. Sai com código 1 em caso de erro (útil na CI) |
| `serve` | Abre a apresentação em `http://localhost:4321` (`--port` para mudar) |

## A apresentação

A página `/onboarding` é um tour em slides, contado como uma história: boas-vindas → o porquê → o negócio → o produto → vocabulário (com cartões que viram e um quiz) → regras do jogo → stack → arquitetura → rodando na máquina → jeito da casa → tour pelo código → cuidados → decisões → primeira missão → final.

Navegação por ← →, espaço, swipe no celular ou pelos segmentos coloridos no topo. `O` abre o índice. O progresso e as tarefas marcadas ficam salvos no navegador. Tem tema claro e escuro. Capítulos sem conteúdo são pulados e listas longas viram vários slides.

## O que vai no JSON

`project`, `business` (modelo de negócio, valor entregue, perfis e jornadas), `gettingStarted`, `stack`, `architecture` (com diagrama Mermaid), `conventions`, `domain` (glossário e regras de negócio), `features`, `tours` pelo código, `gotchas`, `decisions` e `firstTasks`.

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
