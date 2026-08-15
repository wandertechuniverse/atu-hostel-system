import "server-only";

import { ensureDbWarm } from "@/lib/prisma-client";
import { resetDbClient } from "@/lib/db";

function errorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  return String((error as { code?: string }).code ?? "");
}

function errorBlob(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const e = error as {
    name?: string;
    code?: string;
    message?: string;
    meta?: { cause?: unknown };
    cause?: unknown;
  };
  return `${e.name ?? ""} ${e.code ?? ""} ${e.message ?? ""} ${String(e.meta?.cause ?? "")} ${String(e.cause ?? "")}`.toLowerCase();
}

/** True for timeouts — do NOT immediately retry (doubles a multi-second hang). */
export function isTimeoutDbError(error: unknown): boolean {
  const code = errorCode(error);
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "P1002" ||
    code === "P1008" ||
    code === "P2024"
  ) {
    return true;
  }
  const msg = errorBlob(error);
  return (
    msg.includes("etimedout") ||
    msg.includes("timeout exceeded") ||
    msg.includes("timed out") ||
    msg.includes("connection timeout")
  );
}

/**
 * Neon/pg dropped the socket mid-flight (idle kill, cold wake, NAT).
 * Safe to reset the pool and retry once for page-level reads.
 */
export function isConnectionDropDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = errorBlob(error);
  return (
    msg.includes("connection terminated") ||
    msg.includes("connection terminated due to connection timeout") ||
    msg.includes("connection timeout") ||
    msg.includes("server has closed") ||
    msg.includes("connection closed") ||
    msg.includes("closed the connection") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up") ||
    errorCode(error) === "ECONNRESET" ||
    errorCode(error) === "P1017"
  );
}

/** True for transient Neon/pg connectivity failures (retry is often safe). */
export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (isTimeoutDbError(error)) return true;

  const code = errorCode(error);
  if (
    code === "P1001" || // can't reach
    code === "P1017" || // server closed connection
    code === "ECONNRESET" ||
    code === "ECONNREFUSED"
  ) {
    return true;
  }

  const msg = errorBlob(error);
  return (
    msg.includes("can't reach database") ||
    msg.includes("connection terminated") ||
    msg.includes("connection closed") ||
    msg.includes("server has closed") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up") ||
    msg.includes("too many connections") ||
    msg.includes("remaining connection slots") ||
    msg.includes("driveradaptererror") ||
    msg.includes("closed the connection") ||
    // Browser/undici wording when the TCP path to Neon drops mid-query.
    msg.includes("networkerror") ||
    msg.includes("fetch failed") ||
    msg.includes("failed to fetch")
  );
}

export function formatDbError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const e = error as {
    name?: string;
    code?: string;
    message?: string;
    meta?: { cause?: unknown };
    cause?: { message?: string };
  };
  const cause =
    e.meta?.cause != null
      ? String(e.meta.cause)
      : e.cause?.message
        ? e.cause.message
        : "";
  return [e.name, e.code, e.message, cause].filter(Boolean).join(" | ");
}

/**
 * Run a DB operation; on a short-lived connection blip, wait briefly and retry once.
 * Timeouts are NOT retried — that turns one 10s hang into a 20s hang (see markAllReadAction).
 */
export async function withDbRetry<T>(
  label: string,
  op: () => Promise<T>,
): Promise<T> {
  try {
    return await op();
  } catch (first) {
    if (!isTransientDbError(first) || isTimeoutDbError(first)) throw first;
    console.warn(`[db] transient error on ${label}, retrying:`, formatDbError(first));
    await new Promise((r) => setTimeout(r, 100));
    return op();
  }
}

/**
 * Page/read helper: warm the pool, run the op, and on a dropped Neon socket
 * reset the pool once and retry (covers free-tier cold start / idle kills).
 * Prefer this for SSR listings; keep withDbRetry for short mutations.
 */
export async function withDbReadRetry<T>(
  label: string,
  op: () => Promise<T>,
): Promise<T> {
  await ensureDbWarm().catch(() => undefined);
  try {
    return await op();
  } catch (first) {
    if (!isConnectionDropDbError(first) && !isTransientDbError(first)) {
      throw first;
    }
    console.warn(
      `[db] connection drop on ${label}, resetting client and retrying:`,
      formatDbError(first),
    );
    await resetDbClient().catch(() => undefined);
    await new Promise((r) => setTimeout(r, 250));
    return op();
  }
}
