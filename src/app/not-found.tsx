import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Home, KeyRound, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist in the ATU Hostel Booking system.",
  robots: { index: false, follow: false },
};

/**
 * App Router custom 404 (renders for unmatched routes and notFound() calls).
 * Stays in the root layout so theme + fonts apply without pulling staff/student shells.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* Soft brand backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/12%,transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-muted/40 to-transparent"
      />

      <div className="flex w-full max-w-lg flex-col items-center gap-5">
        <span className="rounded-2xl border bg-background/80 p-3 text-primary shadow-sm backdrop-blur">
          <Building2 className="size-7" aria-hidden />
        </span>

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            Error 404
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            This room doesn&apos;t exist
          </h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            The page you opened is not part of the ATU Hostel Booking system. It
            may have been moved, the link is incomplete, or the hostel listing
            is no longer published.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            render={<Link href="/" />}
            nativeButton={false}
            className="gap-2"
          >
            <Home className="size-4" aria-hidden />
            Browse hostels
          </Button>
          <Button
            render={<Link href="/login" />}
            nativeButton={false}
            variant="outline"
            className="gap-2"
          >
            <KeyRound className="size-4" aria-hidden />
            Sign in
          </Button>
        </div>

        <div className="mt-2 w-full rounded-xl border bg-card/60 p-4 text-left shadow-sm backdrop-blur">
          <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Search className="size-3.5" aria-hidden />
            Useful links
          </p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>
              <Link
                href="/"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="size-3.5 text-muted-foreground" aria-hidden />
                Hostel catalog
              </Link>
            </li>
            <li>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="size-3.5 text-muted-foreground" aria-hidden />
                Student / staff login
              </Link>
            </li>
            <li>
              <Link
                href="/prospectus"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="size-3.5 text-muted-foreground" aria-hidden />
                Prospectus
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="size-3.5 text-muted-foreground" aria-hidden />
                Privacy
              </Link>
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          ATU Hostel Booking · Accra Technical University
        </p>
      </div>
    </main>
  );
}
