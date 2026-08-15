import Link from "next/link";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  Bell,
  KeyRound,
  LayoutDashboard,
  LineChart,
  LogOut,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { logoutAction } from "@/lib/actions/auth";
import { CsrfInput } from "@/components/csrf-input";
import { staffPath } from "@/lib/paths";
import type { SessionData } from "@/lib/session";

const nav = [
  { href: "", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { href: "/analytics", label: "Analytics", icon: LineChart, adminOnly: false },
  { href: "/hostels", label: "Hostels", icon: Building2, adminOnly: false },
  { href: "/bookings", label: "Bookings", icon: CalendarCheck2, adminOnly: false },
  { href: "/payments", label: "Payments", icon: Wallet, adminOnly: false },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: false },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/notifications", label: "Notifications", icon: Bell, adminOnly: true },
  { href: "/activity", label: "Audit log", icon: ScrollText, adminOnly: true },
];

/** Sync sidebar — role comes from StaffShell (already DB-validated). */
export function AppSidebar({ role }: { role: SessionData["role"] }) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 font-semibold">
          <Building2 className="size-5" />
          {role === "ADMIN" ? "HBMS Admin" : "HBMS Manager"}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {nav
              .filter((item) => !item.adminOnly || role === "ADMIN")
              .map((item) => (
                <SidebarMenuItem key={item.href || "overview"}>
                  <SidebarMenuButton
                    render={<Link href={staffPath(role, item.href)} />}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 pb-2">
          <p className="truncate text-xs font-medium">
            {role === "ADMIN" ? "Administrator" : "Hostel Manager"}
          </p>
          <Link
            href="/change-password"
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <KeyRound className="size-4" />
            Change password
          </Link>
          <form action={logoutAction} className="mt-2">
            <CsrfInput />
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </form>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
