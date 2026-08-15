import type { ReactNode } from "react";
import { StaffShell } from "@/components/admin/staff-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <StaffShell>{children}</StaffShell>;
}
