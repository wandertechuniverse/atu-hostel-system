import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's project root to this directory: otherwise it scans upward,
  // finds a stray bun.lock in the user's home folder, and warns on every start.
  turbopack: { root: __dirname },
  // The Preview tab's webview loads the dev server via http://127.0.0.1:3000.
  // Next.js 16 blocks dev resources for origins not listed here, which broke
  // hydration (sidebar, dialogs, streamed content). "localhost" is allowed by
  // default; 127.0.0.1 must be added explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Ship the build-time demo SQLite into every serverless function so /tmp can
  // be seeded on cold start (Netlify production without a remote Turso URL).
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"],
  },
  // The Playwright e2e suite starts a second dev server (port 3100) against a
  // dedicated test database. It must not share the preview server's .next
  // cache, so allow an env-driven distDir override.
  ...(process.env.NEXT_DIST_DIR
    ? { distDir: process.env.NEXT_DIST_DIR }
    : {}),
};

export default nextConfig;
