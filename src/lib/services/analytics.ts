import "server-only";

import { db } from "@/lib/db";
import type { SessionData } from "@/lib/session";
import {
  bookingScopeWhere,
  hostelScopeWhere,
  paymentScopeWhere,
} from "@/lib/scoping";

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

/**
 * Role-scoped analytics for the admin dashboard (FR-8).
 * Managers only see their hostel; admins see the whole institution.
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
  const bookingWhere = bookingScopeWhere(session);
  const hostelWhere = hostelScopeWhere(session);
  const paymentWhere = paymentScopeWhere(session);

  const [
    students,
    hostelCount,
    rooms,
    confirmedBookings,
    pendingBookings,
    pendingPayments,
    bedsAgg,
    revenueRows,
    statusGroups,
    paymentGroups,
    recentBookings,
    successPayments,
    failedLogins7d,
    activityToday,
    recentActions,
    hostelsWithRooms,
  ] = await Promise.all([
    isManager
      ? db.booking
          .findMany({
            where: bookingWhere,
            distinct: ["userId"],
            select: { userId: true },
          })
          .then((r) => r.length)
      : db.user.count({ where: { role: "STUDENT" } }),
    db.hostel.count({ where: hostelWhere }),
    db.room.count({
      where: isManager
        ? { hostelId: session.hostelId ?? "__none__" }
        : {},
    }),
    db.booking.count({ where: { ...bookingWhere, status: "CONFIRMED" } }),
    db.booking.count({ where: { ...bookingWhere, status: "PENDING" } }),
    db.payment.count({ where: { ...paymentWhere, status: "PENDING" } }),
    db.room.aggregate({
      where: isManager
        ? { hostelId: session.hostelId ?? "__none__" }
        : {},
      _sum: { capacity: true },
    }),
    db.booking.findMany({
      where: {
        ...bookingWhere,
        payment: { status: "SUCCESS" },
      },
      select: {
        amount: true,
        room: { select: { hostelId: true, hostel: { select: { name: true } } } },
      },
    }),
    db.booking.groupBy({
      by: ["status"],
      where: bookingWhere,
      _count: { _all: true },
    }),
    db.payment.groupBy({
      by: ["status"],
      where: paymentWhere,
      _count: { _all: true },
    }),
    db.booking.findMany({
      where: { ...bookingWhere, createdAt: { gte: since } },
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: "asc" },
    }),
    db.payment.findMany({
      where: {
        ...paymentWhere,
        status: "SUCCESS",
        createdAt: { gte: since },
      },
      select: { amountPaid: true, createdAt: true, paymentDate: true },
    }),
    isManager
      ? Promise.resolve(0)
      : db.activityLog.count({
          where: {
            action: { in: ["auth.login_failed", "auth.rate_limited"] },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
    isManager
      ? Promise.resolve(0)
      : db.activityLog.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
            },
          },
        }),
    isManager
      ? Promise.resolve([] as { action: string; _count: { _all: number } }[])
      : db.activityLog.groupBy({
          by: ["action"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
          orderBy: { _count: { action: "desc" } },
          take: 8,
        }),
    db.hostel.findMany({
      where: hostelWhere,
      select: {
        id: true,
        name: true,
        rooms: {
          select: {
            capacity: true,
            bookings: {
              where: { status: "CONFIRMED" },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalBeds = bedsAgg._sum.capacity ?? 0;
  const occupancyPct =
    totalBeds > 0 ? Math.round((confirmedBookings / totalBeds) * 100) : 0;
  const revenue = revenueRows.reduce((s, b) => s + b.amount, 0);

  const byHostel = new Map<string, { name: string; revenue: number; confirmed: number }>();
  for (const h of hostelsWithRooms) {
    const confirmed = h.rooms.reduce((s, r) => s + r.bookings.length, 0);
    byHostel.set(h.id, { name: h.name, revenue: 0, confirmed });
  }
  for (const row of revenueRows) {
    const id = row.room.hostelId;
    const cur = byHostel.get(id) ?? {
      name: row.room.hostel.name,
      revenue: 0,
      confirmed: 0,
    };
    cur.revenue += row.amount;
    byHostel.set(id, cur);
  }

  const bookingTrend = emptyTrend(days);
  const bookingIndex = new Map(bookingTrend.map((p, i) => [p.date, i]));
  for (const b of recentBookings) {
    const key = dayKey(b.createdAt);
    const idx = bookingIndex.get(key);
    if (idx !== undefined) {
      bookingTrend[idx].count += 1;
      bookingTrend[idx].amount += b.amount;
    }
  }

  const revenueTrend = emptyTrend(days);
  const revenueIndex = new Map(revenueTrend.map((p, i) => [p.date, i]));
  for (const p of successPayments) {
    const when = p.paymentDate ?? p.createdAt;
    const key = dayKey(when);
    const idx = revenueIndex.get(key);
    if (idx !== undefined) {
      revenueTrend[idx].count += 1;
      revenueTrend[idx].amount += p.amountPaid;
    }
  }

  return {
    rangeDays: days,
    kpis: {
      students,
      hostels: hostelCount,
      rooms,
      confirmedBookings,
      pendingBookings,
      occupancyPct,
      revenue,
      pendingPayments,
      failedLogins7d,
      activityToday,
    },
    bookingsByStatus: statusGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
    paymentsByStatus: paymentGroups.map((g) => ({
      status: g.status,
      count: g._count._all,
    })),
    revenueByHostel: [...byHostel.entries()]
      .map(([id, v]) => ({ id, name: v.name, revenue: v.revenue, confirmed: v.confirmed }))
      .sort((a, b) => b.revenue - a.revenue),
    bookingTrend,
    revenueTrend,
    topActions: (recentActions as { action: string; _count: { _all: number } }[]).map(
      (a) => ({ action: a.action, count: a._count._all }),
    ),
  };
}
