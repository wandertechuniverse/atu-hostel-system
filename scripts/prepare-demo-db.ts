/**
 * Build-time helper for serverless hosts (Netlify/Vercel).
 * Creates:
 *   - data/demo.db          (runtime /tmp copy source; gitignored)
 *   - prisma/demo.seed.db   (committed so the function always has a seed file)
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = join(import.meta.dirname, "..");
const dataDir = join(root, "data");
const demoDb = join(dataDir, "demo.db");
const committedSeed = join(root, "prisma", "demo.seed.db");
const demoUrl = `file:${demoDb.replace(/\\/g, "/")}`;

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const env = { ...process.env, DATABASE_URL: demoUrl };

console.log("[prepare-demo-db] pushing schema →", demoUrl);
execSync("bun x prisma db push --accept-data-loss", {
  cwd: root,
  env,
  stdio: "inherit",
});

console.log("[prepare-demo-db] seeding demo dataset");
execSync("bun x prisma db seed", {
  cwd: root,
  env,
  stdio: "inherit",
});

// Always refresh the committed seed so production deploys include accounts.
copyFileSync(demoDb, committedSeed);
console.log("[prepare-demo-db] ready:", demoDb, "→", committedSeed);
