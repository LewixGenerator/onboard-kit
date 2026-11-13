// Grava dist/onboarding.schema.json a partir de src/schema.ts (roda depois do tsc).
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { onboardingSchema } = require("../dist/schema");
const { VERSION } = require("../dist/version");

writeFileSync(join(__dirname, "..", "dist", "onboarding.schema.json"), JSON.stringify(onboardingSchema(VERSION), null, 2) + "\n");
