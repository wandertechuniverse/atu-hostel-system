import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";

export type DayPoint = { date: string; label: string; count: number; amount: number };

export type AnalyticsSnapshot = {
  rangeDays: number;
  kpis: {
    students: number;
    hostels: number;
    rooms: number;
    confirmedBookings: number;
    pendingBookings: number;
    occupancyPct: number;
    revenue: number;
    pendingPayments: number;
    failedLogins7d: number;
    activityToday: number;
  };
  bookingsByStatus: { status: string; count: number }[];
  paymentsByStatus: { status: string; count: number }[];
  revenueByHostel: { id: string; name: string; revenue: number; confirmed: number }[];
  bookingTrend: DayPoint[];
  revenueTrend: DayPoint[];
  topActions: { action: string; count: number }[];
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dayLabel(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function emptyTrend(days: number): DayPoint[] {
  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    out.push({ date: key, label: dayLabel(key), count: 0, amount: 0 });
  }
  return out;
}

type KpiRow = {
  students: number;
  hostels: number;
  rooms: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalBeds: number;
  revenue: number;
  pendingPayments: number;
  successPayments: number;
  failedPayments: number;
  failedLogins7d: number;
  activityToday: number;
};

type StatusCount = { status: string; count: number };
type HostelRev = { id: string; name: string; revenue: number; confirmed: number };
type ActionCount = { action: string; count: number };

/**
 * Role-scoped analytics (FR-8). Managers only see their hostel.
 *
 * Previous implementation fired ~16 parallel Prisma queries. Against Neon
 * from a high-RTT network that serialises through the pooler and costs
 * multi-seconds. This version uses a small number of multi-aggregate SQLs.
 */
export async function getAnalytics(
  session: SessionData,
  rangeDays = 30,
): Promise<AnalyticsSnapshot> {
  const days = Math.min(90, Math.max(7, rangeDays));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const isManager = session.role === "MANAGER";
  const hostelId = session.hostelId ?? "__none__";
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Room/booking/payment scope fragments for manager vs admin.
  const roomScope = isManager
    ? Prisma.sql`r."hostelId" = ${hostelId}`
    : Prisma.sql`true`;
  const bookingScope = isManager
    ? Prisma.sql`r."hostelId" = ${hostelId}`
    : Prisma.sql`true`;
  const paymentScope = isManager
    ? Prisma.sql`r."hostelId" = ${hostelId}`
    : Prisma.sql`true`;
  const hostelScope = isManager
    ? Prisma.sql`h.id = ${hostelId}`
    : Prisma.sql`true`;

  const [kpiRows, hostelRows, bookingTrendRows, paymentTrendRows, topActionRows] =
    await Promise.all([
      db.$queryRaw<KpiRow[]>`
        SELECT
          ${
            isManager
              ? Prisma.sql`(
                  SELECT count(DISTINCT b."userId")::int
                  FROM "Booking" b
                  JOIN "Room" r ON r.id = b."roomId"
                  WHERE r."hostelId" = ${hostelId}
                )`
              : Prisma.sql`(SELECT count(*)::int FROM "User" WHERE role = 'STUDENT')`
          } AS students,
          (SELECT count(*)::int FROM "Hostel" h WHERE ${hostelScope}) AS hostels,
          (SELECT count(*)::int FROM "Room" r WHERE ${roomScope}) AS rooms,
          (SELECT count(*)::int FROM "Booking" b
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${bookingScope} AND b.status = 'CONFIRMED') AS "confirmedBookings",
          (SELECT count(*)::int FROM "Booking" b
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${bookingScope} AND b.status = 'PENDING') AS "pendingBookings",
          (SELECT count(*)::int FROM "Booking" b
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${bookingScope} AND b.status = 'CANCELLED') AS "cancelledBookings",
          (SELECT count(*)::int FROM "Booking" b
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${bookingScope} AND b.status = 'COMPLETED') AS "completedBookings",
          (SELECT coalesce(sum(r.capacity), 0)::int FROM "Room" r WHERE ${roomScope}) AS "totalBeds",
          (SELECT coalesce(sum(b.amount), 0)::float FROM "Booking" b
             JOIN "Room" r ON r.id = b."roomId"
             JOIN "Payment" p ON p."bookingId" = b.id
            WHERE ${bookingScope} AND p.status = 'SUCCESS') AS revenue,
          (SELECT count(*)::int FROM "Payment" p
             JOIN "Booking" b ON b.id = p."bookingId"
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${paymentScope} AND p.status = 'PENDING') AS "pendingPayments",
          (SELECT count(*)::int FROM "Payment" p
             JOIN "Booking" b ON b.id = p."bookingId"
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${paymentScope} AND p.status = 'SUCCESS') AS "successPayments",
          (SELECT count(*)::int FROM "Payment" p
             JOIN "Booking" b ON b.id = p."bookingId"
             JOIN "Room" r ON r.id = b."roomId"
            WHERE ${paymentScope} AND p.status = 'FAILED') AS "failedPayments",
          ${
            isManager
              ? Prisma.sql`0`
              : Prisma.sql`(
                  SELECT count(*)::int FROM "ActivityLog"
                  WHERE action IN ('auth.login_failed', 'auth.rate_limited')
                    AND "createdAt" >= ${weekAgo}
                )`
          } AS "failedLogins7d",
          ${
            isManager
              ? Prisma.sql`0`
              : Prisma.sql`(
                  SELECT count(*)::int FROM "ActivityLog"
                  WHERE "createdAt" >= ${startOfToday}
                )`
          } AS "activityToday"
      `,
      db.$queryRaw<HostelRev[]>`
        SELECT
          h.id,
          h.name,
          coalesce(sum(b.amount) FILTER (WHERE p.status = 'SUCCESS'), 0)::float AS revenue,
          count(b.id) FILTER (WHERE b.status = 'CONFIRMED')::int AS confirmed
        FROM "Hostel" h
        LEFT JOIN "Room" r ON r."hostelId" = h.id
        LEFT JOIN "Booking" b ON b."roomId" = r.id
        LEFT JOIN "Payment" p ON p."bookingId" = b.id
        WHERE ${hostelScope}
        GROUP BY h.id, h.name
        ORDER BY revenue DESC
      `,
      db.$queryRaw<{ day: Date; count: number; amount: number }[]>`
        SELECT date_trunc('day', b."createdAt") AS day,
               count(*)::int AS count,
               coalesce(sum(b.amount), 0)::float AS amount
        FROM "Booking" b
        JOIN "Room" r ON r.id = b."roomId"
        WHERE ${bookingScope} AND b."createdAt" >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      db.$queryRaw<{ day: Date; count: number; amount: number }[]>`
        SELECT date_trunc('day', coalesce(p."paymentDate", p."createdAt")) AS day,
               count(*)::int AS count,
               coalesce(sum(p."amountPaid"), 0)::float AS amount
        FROM "Payment" p
        JOIN "Booking" b ON b.id = p."bookingId"
        JOIN "Room" r ON r.id = b."roomId"
        WHERE ${paymentScope}
          AND p.status = 'SUCCESS'
          AND coalesce(p."paymentDate", p."createdAt") >= ${since}
        GROUP BY 1
        ORDER BY 1
      `,
      isManager
        ? Promise.resolve([] as ActionCount[])
        : db.$queryRaw<ActionCount[]>`
            SELECT action, count(*)::int AS count
            FROM "ActivityLog"
            WHERE "createdAt" >= ${since}
            GROUP BY action
            ORDER BY count DESC
            LIMIT 8
          `,
    ]);

  const k = kpiRows[0] ?? {
    students: 0,
    hostels: 0,
    rooms: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    totalBeds: 0,
    revenue: 0,
    pendingPayments: 0,
    successPayments: 0,
    failedPayments: 0,
    failedLogins7d: 0,
    activityToday: 0,
  };

  const occupancyPct =
    k.totalBeds > 0
      ? Math.round((k.confirmedBookings / k.totalBeds) * 100)
      : 0;

  const bookingsByStatus: StatusCount[] = [
    { status: "PENDING", count: k.pendingBookings },
    { status: "CONFIRMED", count: k.confirmedBookings },
    { status: "CANCELLED", count: k.cancelledBookings },
    { status: "COMPLETED", count: k.completedBookings },
  ].filter((s) => s.count > 0);

  const paymentsByStatus: StatusCount[] = [
    { status: "PENDING", count: k.pendingPayments },
    { status: "SUCCESS", count: k.successPayments },
    { status: "FAILED", count: k.failedPayments },
  ].filter((s) => s.count > 0);

  const bookingTrend = emptyTrend(days);
  const bookingIndex = new Map(bookingTrend.map((p, i) => [p.date, i]));
  for (const row of bookingTrendRows) {
    const key = dayKey(new Date(row.day));
    const idx = bookingIndex.get(key);
    if (idx !== undefined) {
      bookingTrend[idx].count = row.count;
      bookingTrend[idx].amount = row.amount;
    }
  }

  const revenueTrend = emptyTrend(days);
  const revenueIndex = new Map(revenueTrend.map((p, i) => [p.date, i]));
  for (const row of paymentTrendRows) {
    const key = dayKey(new Date(row.day));
    const idx = revenueIndex.get(key);
    if (idx !== undefined) {
      revenueTrend[idx].count = row.count;
      revenueTrend[idx].amount = row.amount;
    }
  }

  return {
    rangeDays: days,
    kpis: {
      students: k.students,
      hostels: k.hostels,
      rooms: k.rooms,
      confirmedBookings: k.confirmedBookings,
      pendingBookings: k.pendingBookings,
      occupancyPct,
      revenue: k.revenue,
      pendingPayments: k.pendingPayments,
      failedLogins7d: k.failedLogins7d,
      activityToday: k.activityToday,
    },
    bookingsByStatus,
    paymentsByStatus,
    revenueByHostel: hostelRows.map((h) => ({
      id: h.id,
      name: h.name,
      revenue: h.revenue,
      confirmed: h.confirmed,
    })),
    bookingTrend,
    revenueTrend,
    topActions: topActionRows,
  };
}
