import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { NotificationMenu } from "@/components/notifications/notification-menu";
import { ThemeToggle } from "@/components/theme-toggle";

function NotificationFallback() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      disabled
      aria-label="Notifications loading"
    >
      <Bell className="size-4 opacity-50" />
    </Button>
  );
}

export async function StaffShell({ children }: { children: ReactNode }) {
  const session = await requireRole("MANAGER", "ADMIN");
  if (!session?.userId) redirect("/login");
  const isAdmin = session.role === "ADMIN";

  return (
    <SidebarProvider>
      <AppSidebar role={session.role} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Open menu" />
          <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
          <span className="truncate text-sm font-medium">
            {isAdmin ? "HBMS Admin" : "HBMS Manager"}
          </span>
          <div className="ml-auto flex items-center gap-1">
            {/* Inbox must not block the page body (Neon RTT otherwise stacks). */}
            <Suspense fallback={<NotificationFallback />}>
              <NotificationMenu userId={session.userId} role={session.role} />
            </Suspense>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
