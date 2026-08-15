import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "Academic disclaimer for the ATU Hostel Booking Management System demo.",
  robots: { index: false, follow: false },
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 prose prose-sm dark:prose-invert">
      <h1 className="text-2xl font-bold tracking-tight">Disclaimer</h1>
      <p className="text-muted-foreground">
        Last updated for the 2026 / 2027 academic project demonstration.
      </p>

      <section className="mt-6 space-y-3 text-sm leading-relaxed text-foreground">
        <h2 className="text-base font-semibold">1. Academic demonstration only</h2>
        <p>
          This Hostel Booking Management System (HBMS) is an{" "}
          <strong>academic project</strong> developed by students of Accra Technical
          University (Diploma in Information Technology). It is intended for learning,
          assessment, and viva demonstration. It is{" "}
          <strong>not</strong> an official ATU production service and does not replace
          any university or private hostel paper process unless the institution adopts
          it formally.
        </p>

        <h2 className="text-base font-semibold">2. No real financial transactions</h2>
        <p>
          Payment is <strong>simulated</strong> (mock Mobile Money). No real Mobile
          Money, card, or bank transfer is processed. References and receipts are for
          demonstration only. Do not enter real payment credentials.
        </p>

        <h2 className="text-base font-semibold">3. Demo data &amp; accounts</h2>
        <p>
          Seeded accounts (for example <code>admin@atu.edu.gh</code> /{" "}
          <code>Demo@ATU2026</code>) and sample hostels are for testing. On public demo
          hosts, data may reset when serverless instances restart. Do not store
          sensitive personal or financial information you are not willing to lose.
        </p>

        <h2 className="text-base font-semibold">4. No liability</h2>
        <p>
          The authors, supervisors, and Accra Technical University accept no liability
          for decisions made using this demo, including accommodation, fees, or
          allocation outcomes shown in the software. Always confirm real-world
          arrangements with the hostel or ATU administration.
        </p>

        <h2 className="text-base font-semibold">5. Booking requests</h2>
        <p>
          Submitting a booking creates a <strong>request</strong>, not a guaranteed
          allocation, until a hostel manager approves it and payment (where required)
          is verified. Sample rules and fees in the prospectus are illustrative.
        </p>

        <h2 className="text-base font-semibold">6. Related documents</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
              Privacy notice
            </Link>
          </li>
          <li>
            <Link href="/prospectus" className="text-primary underline-offset-4 hover:underline">
              Sample prospectus
            </Link>
          </li>
          <li>
            <a
              href="/docs/sample-hostel-prospectus.pdf"
              className="text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Prospectus PDF download
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
