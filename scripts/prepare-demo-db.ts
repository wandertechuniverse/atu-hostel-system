/**
 * Build-time helper for serverless hosts (Netlify/Vercel).
 * Creates data/demo.db with schema + seed so runtime can copy it into /tmp.
 * Local `bun run build` also runs this; the file is gitignored.
 */
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const root = join(import.meta.dirname, "..");
const dataDir = join(root, "data");
const demoDb = join(dataDir, "demo.db");
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

console.log("[prepare-demo-db] ready:", demoDb);
