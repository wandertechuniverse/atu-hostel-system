import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleUserStatusButton } from "@/components/admin/toggle-user-status-button";
import { ManagerAssignmentForm } from "@/components/admin/manager-assignment-form";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { DeleteUserDialog } from "@/components/admin/delete-user-dialog";
import {
  MobileField,
  MobileFieldRow,
  MobileRecord,
} from "@/components/mobile-fields";

export const dynamic = "force-dynamic";

const roleVariant: Record<string, "default" | "secondary" | "outline"> = {
  STUDENT: "secondary",
  MANAGER: "default",
  ADMIN: "outline",
};

/** Prisma/libsql may surface DateTime as Date or ISO string - never assume .getTime(). */
function safeDateKey(value: Date | string | null | undefined) {
  if (!value) return "0";
  if (value instanceof Date) return String(value.getTime());
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? String(value) : String(t);
}

export default async function AdminUsersPage() {
  const session = await requireRole("ADMIN");

  // Administrators only: view all users (A4), activate/deactivate (A6),
  // assign hostel managers (A2). Manager occupancy is derived from users
  // (User.hostelId is unique) so hostels need no manager join.
  const [users, hostels] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        studentIdNumber: true,
        department: true,
        role: true,
        isActive: true,
        updatedAt: true,
        hostel: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.hostel.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const takenBy = new Map(
    users
      .filter((u) => u.hostel)
      .map((u) => [u.hostel!.id, u.id] as const),
  );

  const hostelOptions = hostels.map((h) => ({
    id: h.id,
    name: h.name,
    takenBy: takenBy.get(h.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage accounts and hostel manager assignments. Administrator only.
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All accounts</CardTitle>
          <CardDescription>
            {users.length} user{users.length === 1 ? "" : "s"} · assigning a
            hostel promotes a student to manager
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 lg:hidden">
            {users.map((user) => {
              const isSelf = user.id === session.userId;
              return (
                <MobileRecord
                  key={user.id}
                  className={user.isActive ? "" : "opacity-60"}
                >
                  <MobileField label="Student">
                    <p className="font-medium">
                      {user.name}
                      {isSelf ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (you)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground break-all">
                      {user.email}
                    </p>
                  </MobileField>
                  <MobileField label="Student ID">
                    {user.studentIdNumber ?? "-"}
                  </MobileField>
                  <MobileFieldRow>
                    <MobileField label="Role">
                      <Badge variant={roleVariant[user.role] ?? "secondary"}>
                        {user.role}
                      </Badge>
                    </MobileField>
                    <MobileField label="Status">
                      {user.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </MobileField>
                  </MobileFieldRow>
                  <MobileField label="Hostel">
                    {user.hostel?.name ?? "None"}
                  </MobileField>
                  <div className="flex flex-col gap-1.5">
                    <EditUserDialog
                      key={`m-${user.id}:${safeDateKey(user.updatedAt)}`}
                      user={{
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        studentIdNumber: user.studentIdNumber,
                        department: user.department,
                      }}
                    />
                    <ManagerAssignmentForm
                      key={`m-${user.id}:${user.hostel?.id ?? "none"}`}
                      userId={user.id}
                      currentHostelId={user.hostel?.id ?? null}
                      hostels={hostelOptions}
                    />
                    <ToggleUserStatusButton
                      key={`m-${user.id}:${user.isActive}`}
                      userId={user.id}
                      isActive={user.isActive}
                      isSelf={isSelf}
                    />
                    <DeleteUserDialog
                      userId={user.id}
                      name={user.name}
                      bookingCount={user._count.bookings}
                      isSelf={isSelf}
                    />
                  </div>
                </MobileRecord>
              );
            })}
          </div>
          <div className="hidden min-w-0 overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Hostel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = user.id === session.userId;
                return (
                  <TableRow
                    key={user.id}
                    className={user.isActive ? "" : "opacity-60"}
                  >
                    <TableCell>
                      <div className="font-medium">
                        {user.name}
                        {isSelf && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.studentIdNumber ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[user.role] ?? "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.hostel?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-end gap-1.5">
                        {/* Keyed on updatedAt so a save remounts the dialog
                            with the freshly saved values. */}
                        <EditUserDialog
                          key={`${user.id}:${safeDateKey(user.updatedAt)}`}
                          user={{
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            phone: user.phone,
                            studentIdNumber: user.studentIdNumber,
                            department: user.department,
                          }}
                        />
                        {/* Keyed on the assignment so a save forces a remount -
                            the select otherwise keeps its stale DOM value after
                            the action's revalidation. */}
                        <ManagerAssignmentForm
                          key={`${user.id}:${user.hostel?.id ?? "none"}`}
                          userId={user.id}
                          currentHostelId={user.hostel?.id ?? null}
                          hostels={hostelOptions}
                        />
                        {/* Keyed on status so the Activate/Deactivate label
                            reflects the saved state after revalidation. */}
                        <ToggleUserStatusButton
                          key={`${user.id}:${user.isActive}`}
                          userId={user.id}
                          isActive={user.isActive}
                          isSelf={isSelf}
                        />
                        <DeleteUserDialog
                          userId={user.id}
                          name={user.name}
                          bookingCount={user._count.bookings}
                          isSelf={isSelf}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
