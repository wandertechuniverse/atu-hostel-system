import { ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    status: "ok",
    service: "hbms-api",
    time: new Date().toISOString(),
  });
}
