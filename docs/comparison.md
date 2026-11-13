# onboarding-kit and other tools

[Português](comparativo.md) · [Back to the README](../README.en.md)

Several tools help someone understand a new codebase. They solve different parts of the problem, and many work well together. This page compares onboarding-kit with the best-known ones so you can pick (or combine) them with confidence.

> [!NOTE]
> Based on each product's public information as of **November 2026**. Prices and features change, so check each website before deciding. If something here is wrong or outdated, [open an issue](https://github.com/LewixGenerator/onboard-kit/issues) and we'll fix it.

## In one sentence

| Tool | What it is |
|---|---|
| **onboarding-kit** | A slide-based onboarding written by the AI you already use, with numbers and signals computed from git, served at `/onboarding` inside your own app. Everything local. |
| **[Swimm](https://swimm.io)** | Code documentation platform that stays in sync with the repository, with an AI assistant and IDE extensions. SaaS, with a free plan for small teams and paid per-user plans. |
| **[DeepWiki](https://deepwiki.com)** (Cognition/Devin) | AI-generated wiki for any GitHub repository. Free for public repositories; private ones need a Devin account. |
| **[Code Wiki](https://codewiki.google)** (Google) | Gemini-generated, continuously updated wiki with diagrams and chat. Public preview since November 2025 for open-source repositories; private code was announced as a Gemini CLI extension. |
| **[Backstage](https://backstage.io)** / Spotify Portal | Internal developer portal (service catalog, templates, TechDocs). A CNCF project; Spotify Portal is the managed version. |
| **[CodeScene](https://codescene.com)** | Behavioral code analysis: hotspots, code health, knowledge distribution and off-boarding risk. Paid per active author. |
| **LinearB, Swarmia, Jellyfish** | Engineering metrics (DORA, cycle time, PR flow) connected to GitHub/Jira. Focused on management, not onboarding. |
| **AI assistants** (Claude Code, Cursor, Copilot) | Answer questions about the code on demand. onboarding-kit **uses** them to write the onboarding; it doesn't compete with them. |
| **CodeSee** | Visual code maps. Acquired by GitKraken in May 2024; commercial operations ended afterwards. Listed here for reference. |

## Side by side

✅ yes · 🟡 partly · ❌ no

| | onboarding-kit | Swimm | DeepWiki | Code Wiki | Backstage | CodeScene |
|---|---|---|---|---|---|---|
| **Your code stays on your machine** | ✅ | 🟡 SaaS¹ | ❌ | ❌ | ✅ self-hosted | 🟡 on-premise option |
| **No account, no sign-up** | ✅ | ❌ | 🟡 public repos only | 🟡 public repos only | ✅ | ❌ |
| **Free for private code** | ✅ MIT | 🟡 limited free plan | ❌ | ❌ (yet) | ✅ open source | ❌ |
| **Uses the AI your team already has** | ✅ | ❌ own AI | ❌ own AI | ❌ Gemini | ❌ | ❌ |
| **Onboarding narrative** (why → code, first mission, quiz) | ✅ | 🟡 doc playlists | ❌ wiki | ❌ wiki | ❌ | ❌ |
| **Inside your own app** (`/onboarding`) | ✅ | ❌ | ❌ | ❌ | ❌ separate portal | ❌ |
| **Every claim points to a file and line** | ✅ checked by `validate` | ✅ code-coupled docs | 🟡 links to code | 🟡 links to code | ❌ | ➖ |
| **Warns when text goes stale** | ✅ `status` per commit | ✅ auto-sync | 🟡 re-indexes | ✅ regenerates | ❌ | ➖ |
| **View for POs/CTOs** (health, risks, integrations) | ✅ | ❌ | ❌ | ❌ | 🟡 catalog and scorecards via plugins | ✅ its focus |
| **Hotspots and concentrated knowledge** | 🟡 basic signals | ❌ | ❌ | ❌ | ❌ | ✅ in depth |
| **Architecture diagrams** | ✅ Mermaid | 🟡 | ✅ | ✅ | 🟡 via TechDocs | 🟡 |
| **Portuguese and English** | ✅ incremental translation | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| **Effort to start** | 1 command + 1 prompt | integration and licenses | paste the URL | paste the URL | weeks of rollout | integration and licenses |

¹ According to [Swimm's security page](https://docs.swimm.io/security), in default mode code is not stored on its servers, but parts of it are processed there; an on-premise agent is available for enterprises.

## When to choose each

- **onboarding-kit:** you want newcomers to understand the project in an afternoon, through a presentation with a beginning, middle and end, without sending code anywhere or buying another tool. Works with JavaScript, PHP, Python, Ruby, Go, Java/Kotlin and .NET.
- **Swimm:** the team wants a large, living documentation base edited by people inside the IDE, and is fine with a paid SaaS.
- **DeepWiki / Code Wiki:** you want to explore a **public** repository quickly, or the team already uses Devin or Gemini.
- **Backstage:** the company has dozens or hundreds of services and needs a central catalog, with a platform team to maintain the portal.
- **CodeScene:** leadership needs deep analysis of technical debt and knowledge risk over time, with history and alerts.
- **LinearB / Swarmia / Jellyfish:** the goal is measuring and improving delivery flow, not explaining the code.

## Combinations that work well

- **onboarding-kit + Backstage:** `export` produces a single HTML file that can become a portal page for each service.
- **onboarding-kit + CodeScene:** the onboarding tells the project's story and shows basic signals; CodeScene goes deep on technical debt for whoever sets priorities.
- **onboarding-kit + your AI assistant:** the assistant writes and maintains `onboarding.json` (`npx onboarding-kit agents` teaches it how), and newcomers use the same assistant for day-to-day questions.

## What onboarding-kit doesn't do

To be fair to the other tools:

- It isn't a full documentation base: each section has an item limit so it fits on a slide.
- It doesn't answer questions in real time. Use your AI assistant for that.
- The executive view's signals are a first read of the git history, not a full technical-debt analysis like CodeScene's.
- It has no service catalog or project templates like Backstage.
- Text quality depends on the AI you use. `validate` checks the evidence, but someone on the team should review it (`npx onboarding-kit review`).

## Sources

- Swimm: [pricing](https://swimm.io/pricing) · [security](https://docs.swimm.io/security) · [The CTO Club review](https://thectoclub.com/tools/swimm-review)
- DeepWiki: [Cognition announcement](https://cognition.com/blog/deepwiki)
- Code Wiki: [Google announcement](https://developers.googleblog.com/introducing-code-wiki-accelerating-your-code-understanding/) · [InfoQ](https://infoq.com/news/2025/11/google-code-wiki/) · [The Register](https://www.theregister.com/2025/11/17/google_previews_code_wiki/)
- Backstage: [backstage.io](https://backstage.io) · [Spotify Portal](https://backstage.spotify.com)
- CodeScene: [pricing](https://codescene.com/pricing) · [The CTO Club review](https://thectoclub.com/tools/codescene-review/)
- CodeSee: [GitKraken announcement](https://www.gitkraken.com/blog/gitkraken-launches-devex-platform-acquires-codesee)
