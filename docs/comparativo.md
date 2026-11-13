# onboarding-kit e outras soluções

[English](comparison.md) · [Voltar ao README](../README.md)

Existem várias ferramentas que ajudam alguém a entender um código novo. Elas resolvem partes diferentes do problema, e muitas se complementam. Esta página compara o onboarding-kit com as mais conhecidas, para você escolher (ou combinar) com clareza.

> [!NOTE]
> Comparação feita com informações públicas de cada produto em **novembro de 2026**. Preços e recursos mudam: confira no site de cada um antes de decidir. Se algo aqui estiver errado ou desatualizado, [abra uma issue](https://github.com/LewixGenerator/onboard-kit/issues) que a gente corrige.

## Em uma frase

| Solução | O que é |
|---|---|
| **onboarding-kit** | Apresentação de onboarding em slides, escrita pela IA que você já usa, com números e sinais calculados do git, servida em `/onboarding` dentro do próprio app. Tudo local. |
| **[Swimm](https://swimm.io)** | Plataforma de documentação de código que fica sincronizada com o repositório, com assistente de IA e extensões de IDE. SaaS, com plano gratuito para times pequenos e planos pagos por usuário. |
| **[DeepWiki](https://deepwiki.com)** (Cognition/Devin) | Gera uma wiki com IA para qualquer repositório do GitHub. Grátis para repositórios públicos; os privados precisam de uma conta Devin. |
| **[Code Wiki](https://codewiki.google)** (Google) | Wiki gerada e atualizada pelo Gemini, com diagramas e chat. Lançada em prévia pública em novembro de 2025 para repositórios abertos; a versão para código privado foi anunciada como extensão do Gemini CLI. |
| **[Backstage](https://backstage.io)** / Spotify Portal | Portal interno do desenvolvedor (catálogo de serviços, templates, TechDocs). Projeto da CNCF; o Spotify Portal é a versão gerenciada. |
| **[CodeScene](https://codescene.com)** | Análise comportamental do código: hotspots, saúde do código, distribuição de conhecimento e risco de saída de pessoas. Pago por autor ativo. |
| **LinearB, Swarmia, Jellyfish** | Métricas de engenharia (DORA, tempo de ciclo, fluxo de PRs) conectadas ao GitHub/Jira. Foco em gestão, não em onboarding. |
| **Assistentes de IA** (Claude Code, Cursor, Copilot) | Respondem perguntas sobre o código na hora. O onboarding-kit **usa** esses assistentes para escrever o onboarding, não compete com eles. |
| **CodeSee** | Mapas visuais do código. Foi comprada pela GitKraken em maio de 2024, e as operações comerciais foram encerradas depois. Fica aqui como referência histórica. |

## Comparação lado a lado

✅ sim · 🟡 em parte · ❌ não

| | onboarding-kit | Swimm | DeepWiki | Code Wiki | Backstage | CodeScene |
|---|---|---|---|---|---|---|
| **Seu código fica só na sua máquina** | ✅ | 🟡 SaaS¹ | ❌ | ❌ | ✅ auto-hospedado | 🟡 tem versão on-premise |
| **Sem conta, sem cadastro** | ✅ | ❌ | 🟡 só repos públicos | 🟡 só repos públicos | ✅ | ❌ |
| **Grátis para código privado** | ✅ MIT | 🟡 plano gratuito limitado | ❌ | ❌ (ainda) | ✅ open source | ❌ |
| **Usa a IA que o time já tem** | ✅ | ❌ IA própria | ❌ IA própria | ❌ Gemini | ❌ | ❌ |
| **Narrativa de onboarding** (do porquê ao código, primeira missão, quiz) | ✅ | 🟡 trilhas de docs | ❌ wiki | ❌ wiki | ❌ | ❌ |
| **Dentro do próprio app** (`/onboarding`) | ✅ | ❌ | ❌ | ❌ | ❌ portal separado | ❌ |
| **Cada afirmação aponta para arquivo e linha** | ✅ conferido pelo `validate` | ✅ docs acopladas ao código | 🟡 links para o código | 🟡 links para o código | ❌ | ➖ |
| **Avisa quando o texto envelhece** | ✅ `status` por commit | ✅ auto-sync | 🟡 reindexa | ✅ regenera | ❌ | ➖ |
| **Visão para P.O./CTO** (saúde, riscos, integrações) | ✅ | ❌ | ❌ | ❌ | 🟡 catálogo e scorecards com plugins | ✅ é o foco |
| **Hotspots e conhecimento concentrado** | 🟡 sinais básicos | ❌ | ❌ | ❌ | ❌ | ✅ análise profunda |
| **Diagramas de arquitetura** | ✅ Mermaid | 🟡 | ✅ | ✅ | 🟡 via TechDocs | 🟡 |
| **Português e inglês** | ✅ tradução incremental | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **Esforço para começar** | 1 comando + 1 prompt | integração e licenças | colar a URL | colar a URL | semanas de implantação | integração e licenças |

¹ Segundo a [página de segurança da Swimm](https://docs.swimm.io/security), no modo padrão o código não fica guardado nos servidores dela, mas partes dele são processadas lá; há um agente on-premise para empresas.

## Quando escolher cada um

- **onboarding-kit:** você quer que quem chega entenda o projeto em uma tarde, numa apresentação com começo, meio e fim, sem mandar o código para fora e sem contratar mais uma ferramenta. Funciona em projetos JavaScript, PHP, Python, Ruby, Go, Java/Kotlin e .NET.
- **Swimm:** o time quer uma base de documentação viva e extensa, editada por pessoas, dentro da IDE, e aceita uma ferramenta SaaS paga.
- **DeepWiki / Code Wiki:** você quer explorar rapidamente um repositório **público**, ou o time já usa o Devin ou o Gemini.
- **Backstage:** a empresa tem dezenas ou centenas de serviços e precisa de um catálogo central, com um time de plataforma para manter o portal.
- **CodeScene:** a liderança precisa de análise profunda de dívida técnica e de risco de conhecimento ao longo do tempo, com histórico e alertas.
- **LinearB / Swarmia / Jellyfish:** o objetivo é medir e melhorar o fluxo de entrega do time, não explicar o código.

## Combinações que funcionam bem

- **onboarding-kit + Backstage:** o `export` gera um HTML único, que pode virar uma página do portal para cada serviço.
- **onboarding-kit + CodeScene:** o onboarding conta a história do projeto e mostra os sinais básicos; o CodeScene aprofunda a dívida técnica para quem decide prioridades.
- **onboarding-kit + seu assistente de IA:** o assistente escreve e mantém o `onboarding.json` (`npx onboarding-kit agents` ensina como), e quem chega usa o mesmo assistente para as perguntas do dia a dia.

## O que o onboarding-kit não faz

Para ser justo com as outras soluções:

- Não é uma base de documentação completa: cada seção tem limite de itens para caber num slide.
- Não responde perguntas em tempo real. Para isso, use o seu assistente de IA.
- Os sinais da visão executiva são uma primeira leitura do histórico do git, não uma análise de dívida técnica completa como a do CodeScene.
- Não tem catálogo de serviços nem templates de projeto como o Backstage.
- A qualidade do texto depende da IA que você usa. O `validate` confere as evidências, mas uma pessoa do time deve revisar (`npx onboarding-kit review`).

## Fontes

- Swimm: [planos](https://swimm.io/pricing) · [segurança](https://docs.swimm.io/security) · [análise do The CTO Club](https://thectoclub.com/tools/swimm-review)
- DeepWiki: [anúncio da Cognition](https://cognition.com/blog/deepwiki)
- Code Wiki: [anúncio do Google](https://developers.googleblog.com/introducing-code-wiki-accelerating-your-code-understanding/) · [InfoQ](https://infoq.com/news/2025/11/google-code-wiki/) · [The Register](https://www.theregister.com/2025/11/17/google_previews_code_wiki/)
- Backstage: [backstage.io](https://backstage.io) · [Spotify Portal](https://backstage.spotify.com)
- CodeScene: [preços](https://codescene.com/pricing) · [análise do The CTO Club](https://thectoclub.com/tools/codescene-review/)
- CodeSee: [comunicado da GitKraken](https://www.gitkraken.com/blog/gitkraken-launches-devex-platform-acquires-codesee)
