import { SiteHeader } from "@/components/student/site-header";
import { SiteFooter } from "@/components/student/site-footer";

/**
 * Student-facing shell. The header lives here (not in each page) so it persists
 * across navigations and only the page content below it animates - this is what
 * makes the client-side route transitions feel fluid instead of a full flash.
 */
export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
