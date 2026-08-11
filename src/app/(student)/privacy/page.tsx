import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How the ATU HBMS academic demo collects and uses personal data.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Privacy notice</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Academic demonstration · aligned with project ethics commitments (report §3.13).
      </p>

      <section className="mt-6 space-y-4 text-sm leading-relaxed">
        <div>
          <h2 className="font-semibold">What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Account details: name, email, phone, student ID, department, password (hashed).</li>
            <li>Booking and payment records (simulated payments only).</li>
            <li>Activity log entries (action, actor, IP where available) for audit.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Why we collect it</h2>
          <p className="mt-2 text-muted-foreground">
            To operate the demo hostel booking workflow: authentication, room requests,
            manager approval, payment simulation, receipts, reports, and security audit.
            Data is used for academic purposes only and is not sold to third parties.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">How we protect it</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Passwords stored with bcrypt (never in plain text).</li>
            <li>Role-based access; managers only see their own hostel.</li>
            <li>CSRF protection on state-changing forms; session cookies are httpOnly.</li>
            <li>Password hashes are stripped from database exports.</li>
          </ul>
        </div>
        <div>
          <h2 className="font-semibold">Retention on demo hosts</h2>
          <p className="mt-2 text-muted-foreground">
            Public demo deployments may use ephemeral storage. Data can be wiped when
            instances restart or when the database is reseeded. Do not rely on this
            system as a long-term personal data store.
          </p>
        </div>
        <div>
          <h2 className="font-semibold">Your controls</h2>
          <p className="mt-2 text-muted-foreground">
            Signed-in users may update profile details and change passwords. Administrators
            may deactivate accounts. For concerns about research or UAT participation,
            contact the project team or supervisor in the Department of Information System
            and Technology.
          </p>
        </div>
        <p className="text-muted-foreground">
          See also the{" "}
          <Link href="/disclaimer" className="text-primary underline-offset-4 hover:underline">
            disclaimer
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
