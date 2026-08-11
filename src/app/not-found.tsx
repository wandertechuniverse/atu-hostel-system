import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden>
        <Building2 className="size-6" />
      </span>
      <p className="mt-2 text-sm font-semibold text-primary">404</p>
      <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Button
        render={<Link href="/" />}
        nativeButton={false}
        className="mt-2"
      >
        Back to hostels
      </Button>
    </main>
  );
}
