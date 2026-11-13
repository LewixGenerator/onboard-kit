import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readProjectManifests } from "./detect";
import { cachedMarkers, git, listRepoFiles, TODO_KINDS } from "./facts";

/**
 * Saúde do projeto calculada pelo kit, sem IA: sai do git e dos arquivos, então não custa tokens
 * e nunca fica desatualizada. A IA só explica os riscos (executive.risks).
 */

export type Level = "good" | "attention" | "risk" | "unknown";

export interface Health {
  releases: { level: Level; last12m: number; medianDays?: number; lastTag?: string; lastAt?: string };
  activity: { level: Level; perMonth: number; months: number[] };
  /** Quantas pessoas fazem 80% dos commits no último ano (o "fator ônibus"). */
  knowledge: { level: Level; people: number; authors: number };
  /** TODO/FIXME/HACK por mil linhas de código. */
  debt: { level: Level; markers: number; perKloc: number };
  tests: { level: Level; testFiles: number; sourceFiles: number; coverage?: number };
  dependencies: { level: Level; total: number; restrictive: { name: string; license: string }[] };
  /** Arquivos de código que mais mudaram nos últimos 6 meses. */
  hotspots: { file: string; commits: number }[];
}

export interface Integration {
  name: string;
  category: "payments" | "auth" | "data" | "messaging" | "observability" | "analytics" | "email" | "storage" | "ai" | "flags" | "cms" | "search" | "hosting" | "cloud";
  /** De onde veio: pacote, arquivo ou variável de ambiente. */
  source: string;
}

const BOT = /\[bot\]|^dependabot|^renovate|^github-actions/i;
const CODE = /\.([cm]?[jt]sx?|vue|svelte|astro|py|go|rb|java|kt|cs|php|rs)$/i;
const TEST = /(\.|_)(test|spec)\.|(^|\/)(__tests__|tests?|e2e)\//i;

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function releases(root: string): Health["releases"] {
  const out = git(root, ["for-each-ref", "--sort=-creatordate", "--format=%(refname:short)\t%(creatordate:iso-strict)", "refs/tags"]) ?? "";
  const tags = out.split("\n").map((l) => l.split("\t")).filter(([name, at]) => name && at).map(([name, at]) => ({ name, at: Date.parse(at) }));
  const yearAgo = Date.now() - 365 * 864e5;
  const recent = tags.filter((t) => t.at >= yearAgo);
  const gaps = recent.slice(0, -1).map((t, i) => Math.round((t.at - recent[i + 1].at) / 864e5));
  const medianDays = median(gaps);
  const last = tags[0];
  const level: Level = !tags.length ? "unknown" : !recent.length ? "risk" : (medianDays ?? 99) <= 45 ? "good" : "attention";
  return { level, last12m: recent.length, medianDays, lastTag: last?.name, lastAt: last ? new Date(last.at).toISOString() : undefined };
}

function authorsSince(root: string, since: string): string[] {
  return (git(root, ["log", `--since=${since}`, "--no-merges", "--format=%aN\t%cI"]) ?? "").split("\n").filter(Boolean);
}

function activity(lines: string[]): Health["activity"] {
  const months = Array<number>(6).fill(0);
  const now = new Date();
  for (const line of lines) {
    const at = new Date(line.split("\t")[1]);
    const diff = (now.getFullYear() - at.getFullYear()) * 12 + now.getMonth() - at.getMonth();
    if (diff >= 0 && diff < 6) months[5 - diff]++;
  }
  // projeto novo: a média considera só os meses desde o primeiro commit
  const first = months.findIndex((n) => n > 0);
  const perMonth = first < 0 ? 0 : Math.round(months.reduce((a, b) => a + b, 0) / (6 - first));
  const level: Level = !lines.length ? "unknown" : perMonth >= 8 ? "good" : perMonth >= 2 ? "attention" : "risk";
  return { level, perMonth, months };
}

function knowledge(lines: string[]): Health["knowledge"] {
  const counts: Record<string, number> = {};
  for (const line of lines) {
    const name = line.split("\t")[0].trim();
    if (name && !BOT.test(name)) counts[name] = (counts[name] ?? 0) + 1;
  }
  const sorted = Object.values(counts).sort((a, b) => b - a);
  const total = sorted.reduce((a, b) => a + b, 0);
  let people = 0;
  for (let acc = 0; people < sorted.length && acc < total * 0.8; people++) acc += sorted[people];
  const level: Level = !total ? "unknown" : people >= 3 ? "good" : people === 2 ? "attention" : "risk";
  return { level, people, authors: sorted.length };
}

function coverage(root: string): number | undefined {
  try {
    const summary = JSON.parse(readFileSync(join(root, "coverage", "coverage-summary.json"), "utf8"));
    const pct = Number(summary?.total?.lines?.pct);
    if (Number.isFinite(pct)) return Math.round(pct);
  } catch {
    // sem relatório do istanbul/vitest
  }
  try {
    const lcov = readFileSync(join(root, "coverage", "lcov.info"), "utf8");
    const sum = (key: string) => [...lcov.matchAll(new RegExp(`^${key}:(\\d+)`, "gm"))].reduce((a, m) => a + Number(m[1]), 0);
    const found = sum("LF");
    if (found) return Math.round((sum("LH") / found) * 100);
  } catch {
    // sem lcov
  }
  return undefined;
}

const RESTRICTIVE = /\b(A?GPL|LGPL|SSPL|EUPL|CC-BY-NC|BUSL|Commons-Clause)\b/i;

function dependencies(root: string): Health["dependencies"] {
  const { pkg } = readProjectManifests(root);
  const names = Object.keys({ ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}), ...(pkg?.optionalDependencies ?? {}) });
  const restrictive: { name: string; license: string }[] = [];
  for (const name of Object.keys(pkg?.dependencies ?? {})) {
    try {
      const dep = JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8"));
      const license = typeof dep.license === "string" ? dep.license : Array.isArray(dep.licenses) ? dep.licenses.map((l: { type?: string }) => l.type).join(" OR ") : "";
      if (RESTRICTIVE.test(license) && !/\bOR\b.*\b(MIT|Apache|BSD|ISC)\b|\b(MIT|Apache|BSD|ISC)\b.*\bOR\b/i.test(license)) restrictive.push({ name, license });
    } catch {
      // dependência não instalada
    }
  }
  const level: Level = !pkg ? "unknown" : restrictive.length ? "risk" : names.length > 150 ? "attention" : "good";
  return { level, total: names.length, restrictive };
}

function hotspots(root: string): Health["hotspots"] {
  const counts: Record<string, number> = {};
  for (const file of (git(root, ["log", "--since=6.months", "--no-merges", "--name-only", "--format="]) ?? "").split("\n")) {
    if (CODE.test(file) && !TEST.test(file) && !/(^|\/)(dist|build|vendor|node_modules)\//.test(file) && existsSync(join(root, file))) counts[file] = (counts[file] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([file, commits]) => ({ file, commits }));
}

const cache = new Map<string, { key: string; value: Health }>();

export function projectHealth(root: string): Health {
  const head = git(root, ["rev-parse", "HEAD"]) ?? "";
  const key = `${head}:${Math.floor(Date.now() / 60_000)}`;
  const hit = cache.get(root);
  if (hit?.key === key) return hit.value;

  const year = authorsSince(root, "12.months");
  const markers = cachedMarkers(root);
  const debtCount = TODO_KINDS.reduce((sum, k) => sum + (markers.counts[k] ?? 0), 0);
  const perKloc = markers.lines ? Math.round((debtCount / markers.lines) * 1000 * 10) / 10 : 0;
  const files = listRepoFiles(root).filter((f) => !/(^|\/)(node_modules|dist|build|vendor)\//.test(f));
  const testFiles = files.filter((f) => CODE.test(f) && TEST.test(f)).length;
  const sourceFiles = files.filter((f) => CODE.test(f) && !TEST.test(f)).length;
  const cov = coverage(root);
  const testLevel: Level = !sourceFiles ? "unknown" : cov !== undefined ? (cov >= 70 ? "good" : cov >= 40 ? "attention" : "risk") : testFiles / sourceFiles >= 0.3 ? "good" : testFiles ? "attention" : "risk";

  const value: Health = {
    releases: releases(root),
    activity: activity(year.filter((l) => Date.parse(l.split("\t")[1]) >= Date.now() - 183 * 864e5)),
    knowledge: knowledge(year),
    debt: { level: !markers.lines ? "unknown" : perKloc <= 2 ? "good" : perKloc <= 6 ? "attention" : "risk", markers: debtCount, perKloc },
    tests: { level: testLevel, testFiles, sourceFiles, coverage: cov },
    dependencies: dependencies(root),
    hotspots: hotspots(root),
  };
  cache.set(root, { key, value });
  return value;
}

/* ───────────── integrações e infraestrutura ───────────── */

const PACKAGES: [RegExp, string, Integration["category"]][] = [
  [/^stripe$|^@stripe\//, "Stripe", "payments"],
  [/^@paypal\/|^paypal-rest-sdk$/, "PayPal", "payments"],
  [/^mercadopago$/, "Mercado Pago", "payments"],
  [/^@adyen\//, "Adyen", "payments"],
  [/^@auth0\/|^auth0$/, "Auth0", "auth"],
  [/^@clerk\//, "Clerk", "auth"],
  [/^next-auth$|^@auth\/core$/, "Auth.js", "auth"],
  [/^@okta\//, "Okta", "auth"],
  [/^passport$/, "Passport", "auth"],
  [/^firebase(-admin)?$/, "Firebase", "cloud"],
  [/^@supabase\//, "Supabase", "data"],
  [/^@prisma\/client$|^prisma$/, "Prisma", "data"],
  [/^drizzle-orm$/, "Drizzle", "data"],
  [/^typeorm$/, "TypeORM", "data"],
  [/^sequelize$/, "Sequelize", "data"],
  [/^mongoose$|^mongodb$/, "MongoDB", "data"],
  [/^pg$|^postgres$/, "PostgreSQL", "data"],
  [/^mysql2?$/, "MySQL", "data"],
  [/^redis$|^ioredis$|^@upstash\/redis$/, "Redis", "data"],
  [/^@planetscale\//, "PlanetScale", "data"],
  [/^kafkajs$/, "Kafka", "messaging"],
  [/^amqplib$|^amqp-connection-manager$/, "RabbitMQ", "messaging"],
  [/^bullmq?$/, "BullMQ", "messaging"],
  [/^@aws-sdk\/client-sqs$/, "Amazon SQS", "messaging"],
  [/^@sentry\//, "Sentry", "observability"],
  [/^dd-trace$|^@datadog\//, "Datadog", "observability"],
  [/^newrelic$/, "New Relic", "observability"],
  [/^@opentelemetry\//, "OpenTelemetry", "observability"],
  [/^pino$|^winston$/, "Logs estruturados", "observability"],
  [/^posthog-(js|node)$/, "PostHog", "analytics"],
  [/^mixpanel(-browser)?$/, "Mixpanel", "analytics"],
  [/^@segment\/|^analytics-node$/, "Segment", "analytics"],
  [/^@amplitude\//, "Amplitude", "analytics"],
  [/^@vercel\/analytics$/, "Vercel Analytics", "analytics"],
  [/^@sendgrid\/mail$/, "SendGrid", "email"],
  [/^resend$/, "Resend", "email"],
  [/^nodemailer$/, "SMTP (Nodemailer)", "email"],
  [/^postmark$/, "Postmark", "email"],
  [/^twilio$/, "Twilio", "messaging"],
  [/^@slack\//, "Slack", "messaging"],
  [/^@aws-sdk\/client-s3$|^aws-sdk$/, "AWS S3", "storage"],
  [/^cloudinary$/, "Cloudinary", "storage"],
  [/^@vercel\/blob$/, "Vercel Blob", "storage"],
  [/^uploadthing$/, "UploadThing", "storage"],
  [/^openai$/, "OpenAI", "ai"],
  [/^@anthropic-ai\/sdk$/, "Anthropic", "ai"],
  [/^@google\/generative-ai$|^@google\/genai$/, "Google Gemini", "ai"],
  [/^ai$/, "Vercel AI SDK", "ai"],
  [/^launchdarkly-|^@launchdarkly\//, "LaunchDarkly", "flags"],
  [/^unleash-client$|^@unleash\//, "Unleash", "flags"],
  [/^@growthbook\//, "GrowthBook", "flags"],
  [/^contentful$/, "Contentful", "cms"],
  [/^@sanity\/client$|^next-sanity$/, "Sanity", "cms"],
  [/^@strapi\//, "Strapi", "cms"],
  [/^algoliasearch$/, "Algolia", "search"],
  [/^@elastic\/elasticsearch$/, "Elasticsearch", "search"],
  [/^meilisearch$/, "Meilisearch", "search"],
  [/^@google-cloud\//, "Google Cloud", "cloud"],
  [/^@azure\//, "Azure", "cloud"],
];

const FILES: [string, string, Integration["category"]][] = [
  ["vercel.json", "Vercel", "hosting"],
  ["netlify.toml", "Netlify", "hosting"],
  ["fly.toml", "Fly.io", "hosting"],
  ["render.yaml", "Render", "hosting"],
  ["railway.json", "Railway", "hosting"],
  ["wrangler.toml", "Cloudflare Workers", "hosting"],
  ["app.yaml", "Google App Engine", "hosting"],
  ["Procfile", "Heroku", "hosting"],
  ["serverless.yml", "Serverless Framework", "hosting"],
  ["amplify.yml", "AWS Amplify", "hosting"],
  ["firebase.json", "Firebase Hosting", "hosting"],
  ["Dockerfile", "Docker", "hosting"],
  ["docker-compose.yml", "Docker Compose", "hosting"],
  ["compose.yaml", "Docker Compose", "hosting"],
];

const TERRAFORM: [RegExp, string][] = [
  [/provider\s+"aws"/, "AWS (Terraform)"],
  [/provider\s+"google"/, "Google Cloud (Terraform)"],
  [/provider\s+"azurerm"/, "Azure (Terraform)"],
  [/provider\s+"cloudflare"/, "Cloudflare (Terraform)"],
];

/** Serviços externos e onde o projeto roda, a partir das dependências e dos arquivos de infraestrutura. */
export function detectIntegrations(root: string): Integration[] {
  const found = new Map<string, Integration>();
  const add = (i: Integration) => {
    if (!found.has(i.name)) found.set(i.name, i);
  };
  const { pkg } = readProjectManifests(root);
  for (const dep of Object.keys({ ...(pkg?.dependencies ?? {}), ...(pkg?.optionalDependencies ?? {}) })) {
    const hit = PACKAGES.find(([re]) => re.test(dep));
    if (hit) add({ name: hit[1], category: hit[2], source: `package.json (${dep})` });
  }
  for (const [file, name, category] of FILES) if (existsSync(join(root, file))) add({ name, category, source: file });
  for (const dir of [".", "infra", "terraform", "deploy"]) {
    let entries: string[] = [];
    try {
      entries = readdirSync(join(root, dir)).filter((f) => f.endsWith(".tf"));
    } catch {
      continue;
    }
    for (const f of entries.slice(0, 30)) {
      const source = readFileSync(join(root, dir, f), "utf8");
      for (const [re, name] of TERRAFORM) if (re.test(source)) add({ name, category: "cloud", source: join(dir, f).replace(/^\.\//, "") });
    }
  }
  return [...found.values()];
}
