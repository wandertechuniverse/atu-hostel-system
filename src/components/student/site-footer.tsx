import Link from "next/link";

/**
 * Shared footer for student-facing pages: legal links, prospectus, demo notice.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-1">
          <p className="font-medium text-foreground">ATU Hostel Booking</p>
          <p className="text-xs leading-relaxed">
            Academic project for Accra Technical University (Diploma in Information
            Technology). Payments are simulated - no real money is processed.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <Link href="/disclaimer" className="hover:text-foreground hover:underline">
            Disclaimer
          </Link>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <Link href="/prospectus" className="hover:text-foreground hover:underline">
            Sample prospectus
          </Link>
          <a
            href="/docs/sample-hostel-prospectus.pdf"
            className="hover:text-foreground hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Prospectus PDF
          </a>
          <Link href="/login" className="hover:text-foreground hover:underline">
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
