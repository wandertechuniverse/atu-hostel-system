import Link from "next/link";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background px-4 py-10">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <Link
        href="/"
        className="relative mb-6 flex items-center gap-2 text-lg font-semibold"
      >
        <span className="rounded-lg bg-primary p-1.5 text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        ATU Hostel Booking
      </Link>
      <Card className="relative w-full max-w-sm shadow-lg">
        <CardContent className="p-6">{children}</CardContent>
      </Card>
    </main>
  );
}
