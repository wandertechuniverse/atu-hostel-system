import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sample prospectus",
  description:
    "Sample ATU hostel accommodation prospectus for the HBMS academic demo.",
};

export default function ProspectusPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Academic sample document
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Hostel accommodation prospectus
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accra Technical University · HBMS demonstration (2026 / 2027)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={
              <a
                href="/docs/sample-hostel-prospectus.pdf"
                download
                target="_blank"
                rel="noreferrer"
              />
            }
            nativeButton={false}
            size="sm"
          >
            <Download className="size-4" />
            Download PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<a href="/docs/sample-hostel-prospectus.pdf" target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            <Printer className="size-4" />
            Open / print
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-6 rounded-xl border bg-card p-6 text-sm leading-relaxed shadow-sm">
        <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          <FileText className="mt-0.5 size-4 shrink-0" />
          <p>
            This is a <strong className="text-foreground">sample prospectus</strong> for
            project documentation and viva. It is not an official ATU publication. Real
            hostels would attach their own rules, fees, and facilities schedule.
          </p>
        </div>

        <section>
          <h2 className="font-semibold">1. Purpose</h2>
          <p className="mt-2 text-muted-foreground">
            Explain how students request on-campus and private-perimeter accommodation
            through the Hostel Booking Management System: search, request a room, manager
            approval, simulated Mobile Money payment, and printable receipt.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">2. Eligibility</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Registered student account with student ID</li>
            <li>Acceptance of platform disclaimer and privacy notice</li>
            <li>Available bed in a published hostel room</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold">3. Fees (illustrative demo range)</h2>
          <p className="mt-2 text-muted-foreground">
            Priced per academic session (e.g. 2026/2027), typically GH₵ 3,500 – 6,000 in
            the seed dataset. Amounts are snapshotted onto the booking and cannot be
            changed from the browser.
          </p>
        </section>

        <section>
          <h2 className="font-semibold">4. Sample rules</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>A booking is a request until a manager approves it.</li>
            <li>Beds are allocated only for confirmed bookings — double allocation is blocked.</li>
            <li>Payment is mock only; no real money is collected by this software.</li>
            <li>Managers only manage their own hostel; administrators oversee all hostels.</li>
          </ol>
        </section>

        <section>
          <h2 className="font-semibold">5. How to use the system</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Browse hostels on the{" "}
              <Link href="/" className="text-primary underline-offset-4 hover:underline">
                home page
              </Link>
              .
            </li>
            <li>Open a hostel detail page and choose an available room.</li>
            <li>Submit a booking request (accept rules + disclaimer).</li>
            <li>
              Track status under{" "}
              <Link href="/my-bookings" className="text-primary underline-offset-4 hover:underline">
                My bookings
              </Link>
              ; pay after approval.
            </li>
          </ol>
        </section>

        <p className="text-xs text-muted-foreground">
          Related:{" "}
          <Link href="/disclaimer" className="underline-offset-4 hover:underline">
            Disclaimer
          </Link>
          {" · "}
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
