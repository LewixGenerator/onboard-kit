export type ChapterId =
  | "welcome"
  | "why"
  | "business"
  | "product"
  | "language"
  | "rules"
  | "stack"
  | "architecture"
  | "setup"
  | "conventions"
  | "tours"
  | "gotchas"
  | "decisions"
  | "mission"
  | "finale";

/** Matiz (HSL) de cada capítulo: cada etapa do tour tem a sua cor. */
export const CHAPTER_HUES: Record<ChapterId, number> = {
  welcome: 255,
  why: 275,
  business: 158,
  product: 330,
  language: 192,
  rules: 28,
  stack: 220,
  architecture: 285,
  setup: 145,
  conventions: 42,
  tours: 205,
  gotchas: 12,
  decisions: 305,
  mission: 165,
  finale: 255,
};

const pt = {
  chapters: {
    welcome: "Boas-vindas",
    why: "O porquê",
    business: "O negócio",
    product: "O produto",
    language: "Vocabulário",
    rules: "Regras do jogo",
    stack: "A stack",
    architecture: "Arquitetura",
    setup: "Mãos à obra",
    conventions: "Jeito da casa",
    tours: "Tour pelo código",
    gotchas: "Cuidados",
    decisions: "Decisões",
    mission: "Primeira missão",
    finale: "Pronto!",
  } as Record<ChapterId, string>,
  welcome: {
    hi: "Oi! Que bom ter você por aqui.",
    title: (name: string) => `Bem-vindo ao ${name}`,
    intro: (min: number) =>
      `Este é um tour de uns ${min} minutos com tudo o que vale saber antes de abrir o seu primeiro PR: por que o projeto existe, como o negócio funciona, como o código se organiza e onde pisar com cuidado.`,
    start: "Começar o tour",
    journey: "O caminho até lá",
  },
  why: {
    title: "Primeiro, o porquê",
    lede: "Antes de qualquer linha de código: o problema que a gente resolve.",
    audience: "Quem usa",
    status: "Em que pé estamos",
  },
  business: {
    title: "Como o negócio funciona",
    lede: "Entender o negócio é o que transforma código que funciona em código que faz sentido.",
    model: "O modelo",
    value: "O valor que entregamos",
    actorsTitle: "Quem faz parte dessa história",
    actorsLede: "Os perfis que aparecem no produto e no código.",
    flowsTitle: "As jornadas principais",
    flowsLede: "O caminho que as pessoas percorrem dentro do produto.",
  },
  product: {
    title: "O que o produto faz",
    lede: "As funcionalidades que você vai encontrar (e mexer) por aqui.",
  },
  language: {
    title: "Fale a língua da casa",
    lede: "Termos que aparecem nas conversas, nas telas e no código. Toque num cartão para ver o significado.",
    tap: "toque para virar",
    quizTitle: "Pausa rápida: valendo nada!",
    quizLede: "Umas perguntinhas para fixar o vocabulário.",
    question: (term: string) => `O que significa “${term}”?`,
    right: "Isso aí! 🎯",
    wrong: "Quase! A resposta certa ficou destacada.",
    score: "Você acertou {right} de {total}.",
  },
  rules: {
    title: "As regras do jogo",
    lede: "Regras de negócio que o código garante. Quebrar uma delas costuma virar bug em produção.",
    rule: "Regra",
  },
  stack: {
    title: "As ferramentas da casa",
    lede: "A stack, e para que cada peça serve aqui dentro.",
  },
  architecture: {
    title: "Como as peças se encaixam",
    modulesTitle: "Onde fica cada coisa",
    modulesLede: "O mapa das pastas que importam.",
  },
  setup: {
    title: "Bora rodar na sua máquina",
    lede: "Do zero ao projeto rodando, passo a passo.",
    prereq: "Tenha instalado",
    commandsTitle: "Comandos do dia a dia",
    commandsLede: "Os scripts que você vai usar toda hora.",
    envTitle: "Variáveis de ambiente",
    envLede: "Peça os valores ao time e nunca commite o seu .env.",
    required: "obrigatória",
    optional: "opcional",
    copy: "Copiar",
    copied: "Copiado!",
  },
  conventions: {
    title: "Como a gente escreve código por aqui",
    lede: "Seguir o jeito da casa deixa o review mais rápido (e mais feliz).",
  },
  tours: {
    kicker: "Tour guiado",
    intro: "Abra os arquivos no editor e siga comigo, uma parada de cada vez.",
    stops: "Paradas",
    stop: (i: number, total: number) => `Parada ${i} de ${total}`,
  },
  gotchas: {
    title: "Cuidado com as cascas de banana",
    lede: "Coisas que já pegaram alguém desprevenido. Agora não pegam mais você.",
  },
  decisions: {
    title: "Por que é assim?",
    lede: "Decisões que explicam o formato do código.",
    context: "O contexto",
    decision: "O que decidimos",
  },
  mission: {
    title: "Sua primeira missão",
    lede: "Tarefas pequenas e seguras para começar a contribuir. Marque conforme for fazendo.",
  },
  finale: {
    title: "Você está pronto!",
    lede: "Agora você conhece o porquê, o quê e o como do projeto. Bem-vindo ao time 💜",
    recap: "O que você viu",
    tasks: "{done} de {total} tarefas da primeira missão concluídas",
    restart: "Ver de novo",
    index: "Rever um capítulo",
  },
  ui: {
    prev: "Anterior",
    next: "Próximo",
    overview: "Índice",
    theme: "Alternar tema claro/escuro",
    keys: "use ← → para navegar",
    resume: "Continuar de onde parou (slide {n})?",
    resumeYes: "Continuar",
    resumeNo: "Do início",
    close: "Fechar",
    chapters: "Capítulos",
    generated: "Gerado em",
    by: "por",
    minutes: "min",
  },
  pending: {
    title: "O onboarding ainda não foi gerado",
    body: "O onboarding.json já existe, mas a IA ainda não o preencheu. Leva só um minuto:",
    steps: [
      "Copie o prompt abaixo",
      "Cole na IA que você usa neste projeto (Claude Code, Cursor, Copilot…)",
      "Deixe esta página aberta: ela se atualiza sozinha quando o onboarding ficar pronto",
    ],
    copy: "Copiar prompt",
    copied: "Copiado!",
    waiting: "Aguardando a IA…",
    progress: "{done} de {total} seções preenchidas",
    sections: {
      project: "Visão geral",
      business: "Negócio",
      features: "Produto",
      domain: "Vocabulário e regras",
      stack: "Stack",
      architecture: "Arquitetura",
      gettingStarted: "Como rodar",
      conventions: "Convenções",
      tours: "Tour pelo código",
      gotchas: "Cuidados",
      decisions: "Decisões",
      firstTasks: "Primeira missão",
      brand: "Cores e logo",
    } as Record<string, string>,
  },
  missing: {
    title: "Vamos criar o onboarding deste projeto",
    body: "Ainda não existe um onboarding.json aqui. A sua IA cria e preenche o arquivo:",
    manual: "Prefere começar à mão? Rode na raiz do projeto:",
  },
  invalid: { title: "O arquivo de onboarding tem um erro", body: "Se a IA ainda está escrevendo o arquivo, espere: esta página se atualiza sozinha." },
};

export type Copy = typeof pt;

const en: Copy = {
  chapters: {
    welcome: "Welcome",
    why: "The why",
    business: "The business",
    product: "The product",
    language: "Vocabulary",
    rules: "Ground rules",
    stack: "The stack",
    architecture: "Architecture",
    setup: "Hands on",
    conventions: "House style",
    tours: "Code tour",
    gotchas: "Watch out",
    decisions: "Decisions",
    mission: "First mission",
    finale: "Ready!",
  },
  welcome: {
    hi: "Hi! Great to have you here.",
    title: (name) => `Welcome to ${name}`,
    intro: (min) =>
      `This is a ~${min} minute tour of everything worth knowing before your first PR: why the project exists, how the business works, how the code is organized and where to tread carefully.`,
    start: "Start the tour",
    journey: "The road ahead",
  },
  why: {
    title: "First, the why",
    lede: "Before any line of code: the problem we solve.",
    audience: "Who uses it",
    status: "Where we are",
  },
  business: {
    title: "How the business works",
    lede: "Understanding the business turns code that works into code that makes sense.",
    model: "The model",
    value: "The value we deliver",
    actorsTitle: "Who is part of this story",
    actorsLede: "The roles that show up in the product and in the code.",
    flowsTitle: "The main journeys",
    flowsLede: "The path people take inside the product.",
  },
  product: { title: "What the product does", lede: "The features you will find (and touch) around here." },
  language: {
    title: "Speak the house language",
    lede: "Terms you will hear in conversations, screens and code. Tap a card to see its meaning.",
    tap: "tap to flip",
    quizTitle: "Quick break: just for fun!",
    quizLede: "A few questions to lock in the vocabulary.",
    question: (term) => `What does “${term}” mean?`,
    right: "Nailed it! 🎯",
    wrong: "Almost! The right answer is highlighted.",
    score: "You got {right} of {total}.",
  },
  rules: {
    title: "The ground rules",
    lede: "Business rules the code enforces. Breaking one usually becomes a production bug.",
    rule: "Rule",
  },
  stack: { title: "The tools of the house", lede: "The stack, and what each piece is for in here." },
  architecture: {
    title: "How the pieces fit together",
    modulesTitle: "Where everything lives",
    modulesLede: "A map of the folders that matter.",
  },
  setup: {
    title: "Let's run it on your machine",
    lede: "From zero to running, step by step.",
    prereq: "Have installed",
    commandsTitle: "Everyday commands",
    commandsLede: "The scripts you will use all the time.",
    envTitle: "Environment variables",
    envLede: "Ask the team for the values and never commit your .env.",
    required: "required",
    optional: "optional",
    copy: "Copy",
    copied: "Copied!",
  },
  conventions: {
    title: "How we write code around here",
    lede: "Following the house style makes reviews faster (and happier).",
  },
  tours: {
    kicker: "Guided tour",
    intro: "Open the files in your editor and follow along, one stop at a time.",
    stops: "Stops",
    stop: (i, total) => `Stop ${i} of ${total}`,
  },
  gotchas: { title: "Mind the banana peels", lede: "Things that caught someone off guard before. Not you, though." },
  decisions: {
    title: "Why is it like this?",
    lede: "Decisions that explain the shape of the code.",
    context: "The context",
    decision: "What we decided",
  },
  mission: { title: "Your first mission", lede: "Small, safe tasks to start contributing. Check them off as you go." },
  finale: {
    title: "You're ready!",
    lede: "You now know the why, the what and the how of this project. Welcome to the team 💜",
    recap: "What you've seen",
    tasks: "{done} of {total} first-mission tasks done",
    restart: "Watch again",
    index: "Revisit a chapter",
  },
  ui: {
    prev: "Back",
    next: "Next",
    overview: "Index",
    theme: "Toggle light/dark theme",
    keys: "use ← → to navigate",
    resume: "Pick up where you left off (slide {n})?",
    resumeYes: "Continue",
    resumeNo: "From the start",
    close: "Close",
    chapters: "Chapters",
    generated: "Generated on",
    by: "by",
    minutes: "min",
  },
  pending: {
    title: "Onboarding has not been generated yet",
    body: "onboarding.json exists, but your AI has not filled it in yet. It only takes a minute:",
    steps: [
      "Copy the prompt below",
      "Paste it into the AI you use in this project (Claude Code, Cursor, Copilot…)",
      "Keep this page open: it refreshes by itself when the onboarding is ready",
    ],
    copy: "Copy prompt",
    copied: "Copied!",
    waiting: "Waiting for the AI…",
    progress: "{done} of {total} sections filled",
    sections: {
      project: "Overview",
      business: "Business",
      features: "Product",
      domain: "Vocabulary and rules",
      stack: "Stack",
      architecture: "Architecture",
      gettingStarted: "Running it",
      conventions: "Conventions",
      tours: "Code tour",
      gotchas: "Watch out",
      decisions: "Decisions",
      firstTasks: "First mission",
      brand: "Colors and logo",
    },
  },
  missing: {
    title: "Let's create this project's onboarding",
    body: "There is no onboarding.json here yet. Your AI creates and fills it in:",
    manual: "Prefer to start by hand? Run at the project root:",
  },
  invalid: { title: "The onboarding file has an error", body: "If the AI is still writing the file, hang on: this page refreshes by itself." },
};

export function copyFor(language?: string): Copy {
  return language && !language.toLowerCase().startsWith("pt") ? en : pt;
}
