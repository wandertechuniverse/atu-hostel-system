import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { db } from "@/lib/db";
import { formatDbError, withDbReadRetry } from "@/lib/db-errors";
import { ViewToggle } from "@/components/student/view-toggle";
import { isRoomBookable } from "@/lib/availability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find your room at ATU",
  description:
    "Browse ATU campus hostels and private hostels around Adabraka - compare rooms, prices and live availability, then book in one click.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Find your room at ATU",
    description:
      "Browse ATU campus hostels and private hostels around Adabraka with live availability.",
    url: "/",
  },
};

const PRICE_BUCKETS = [
  { value: "", label: "Any price" },
  { value: "4000", label: "Up to GH₵ 4,000" },
  { value: "5000", label: "Up to GH₵ 5,000" },
  { value: "6000", label: "Up to GH₵ 6,000" },
];

function loadApprovedHostels() {
  return db.hostel.findMany({
    where: { isApproved: true },
    include: {
      rooms: {
        include: {
          bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; maxPrice?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const type = sp.type === "UNIVERSITY" || sp.type === "PRIVATE" ? sp.type : "";
  const maxPrice = Number(sp.maxPrice) > 0 ? Number(sp.maxPrice) : null;
  const hasFilters = Boolean(q || type || maxPrice);

  let hostels: Awaited<ReturnType<typeof loadApprovedHostels>> = [];
  let dbError: string | null = null;

  try {
    hostels = await withDbReadRetry("home.hostels", loadApprovedHostels);
  } catch (error) {
    // Neon free compute / idle pool drops must not 500 the public home page.
    dbError = formatDbError(error);
    console.error("[home] hostel list failed:", dbError);
  }

  const qLower = q.toLowerCase();
  const filtered = hostels.filter((hostel) => {
    if (q && !`${hostel.name} ${hostel.location}`.toLowerCase().includes(qLower)) {
      return false;
    }
    if (type && hostel.type !== type) return false;
    if (maxPrice !== null) {
      const hasRoomInBudget = hostel.rooms.some(
        (room) =>
          isRoomBookable(room.status, room.capacity, room.bookings.length) &&
          room.pricePerSemester <= maxPrice,
      );
      if (!hasRoomInBudget) return false;
    }
    return true;
  });

  const campusCount = hostels.filter((h) => h.type === "UNIVERSITY").length;
  const privateCount = hostels.filter((h) => h.type === "PRIVATE").length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <section className="relative mb-8 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <h1 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
          Find your room at ATU
        </h1>
        <p className="relative mt-3 max-w-2xl text-muted-foreground">
          One place to search, compare and book rooms across ATU campus hostels and
          private hostels around Adabraka. Live availability - no more walking
          between hostels to find out they are full.
        </p>
        <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-background/70 px-3 py-1 font-medium">
            {hostels.length} hostels listed
          </span>
          <span className="rounded-full bg-background/70 px-3 py-1 font-medium">
            {campusCount} on-campus
          </span>
          <span className="rounded-full bg-background/70 px-3 py-1 font-medium">
            {privateCount} private
          </span>
        </div>
      </section>

      {dbError && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
        >
          <p className="font-medium">Could not load hostels right now</p>
          <p className="mt-1 text-amber-800/90 dark:text-amber-200/90">
            {/localhost|127\.0\.0\.1|econnrefused/i.test(dbError)
              ? "Local database is not running. In a terminal: bun run db:local  then  bun run db:seed  and click Retry."
              : "The database is waking up or briefly unreachable. Wait a few seconds and try again."}
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex h-8 items-center rounded-md bg-amber-600 px-3 text-xs font-medium text-white hover:bg-amber-700"
          >
            Retry
          </Link>
        </div>
      )}

      {/* Plain GET form - filters live in the URL, no client JS needed. */}
      <form
        method="get"
        action="/"
        className="mb-8 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="q"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <Search className="size-3.5" />
            Search hostels or areas
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="e.g. Al-Hassan, Bubuashie, Adabraka"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="type"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            Category
          </label>
          <select
            id="type"
            name="type"
            defaultValue={type}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">All hostels</option>
            <option value="UNIVERSITY">ATU On-Campus</option>
            <option value="PRIVATE">Private Perimeter</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="maxPrice"
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
          >
            Max price / year
          </label>
          <select
            id="maxPrice"
            name="maxPrice"
            defaultValue={sp.maxPrice ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {PRICE_BUCKETS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {bucket.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="size-4" />
            Search
          </button>
          {hasFilters && (
            <a
              href="/"
              className="inline-flex h-9 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
              Clear
            </a>
          )}
        </div>
      </form>

      {hasFilters && !dbError && (
        <p className="mb-4 text-sm text-muted-foreground">
          {filtered.length} of {hostels.length} hostels match your filters.
        </p>
      )}

      {!dbError && <ViewToggle hostels={filtered} />}
    </main>
  );
}
