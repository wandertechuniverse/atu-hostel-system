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
import { getSession } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { CsrfInput } from "@/components/csrf-input";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart, adminOnly: false },
  { href: "/admin/hostels", label: "Hostels", icon: Building2, adminOnly: false },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck2, adminOnly: false },
  { href: "/admin/payments", label: "Payments", icon: Wallet, adminOnly: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, adminOnly: false },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, adminOnly: true },
  { href: "/admin/activity", label: "Audit log", icon: ScrollText, adminOnly: true },
];

export async function AppSidebar() {
  const session = await getSession();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 font-semibold">
          <Building2 className="size-5" />
          HBMS Admin
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {nav
              .filter((item) => !item.adminOnly || session.role === "ADMIN")
              .map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton render={<Link href={item.href} />}>
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
            {session.role === "ADMIN" ? "Administrator" : "Hostel Manager"}
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
