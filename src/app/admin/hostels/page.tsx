import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { hostelScopeWhere } from "@/lib/scoping";
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
import { HostelDialog } from "@/components/admin/hostel-dialog";
import { RoomsDialog } from "@/components/admin/rooms-dialog";
import { HostelImageDialog } from "@/components/admin/hostel-image-dialog";
import { HostelManagerDialog } from "@/components/admin/hostel-manager-dialog";
import { HostelApprovalButton } from "@/components/admin/hostel-approval-button";
import { DeleteHostelButton } from "@/components/admin/delete-hostel-button";

export const dynamic = "force-dynamic";

export default async function AdminHostelsPage() {
  const session = await requireRole("MANAGER", "ADMIN");
  const isManager = session.role === "MANAGER";

  // Row-level security: a manager sees exactly their own hostel.
  const [hostels, managerCandidates] = await Promise.all([
    db.hostel.findMany({
      where: hostelScopeWhere(session),
      include: {
        manager: { select: { id: true, name: true } },
        rooms: {
        select: {
          id: true,
          roomNumber: true,
          roomType: true,
          capacity: true,
          pricePerSemester: true,
          status: true,
          description: true,
        },
      },
      },
      orderBy: { name: "asc" },
    }),
    // Everyone who could run a hostel: students (promoted on assignment) and
    // current managers. Admins are never scoped to a single hostel.
    db.user.findMany({
      where: { role: { in: ["STUDENT", "MANAGER"] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Managers without a hostel can create one (they become its manager);
  // managers with one already get a clear error from the action.
  const canCreate = !isManager || !session.hostelId;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hostels</h1>
          <p className="text-sm text-muted-foreground">
            {isManager
              ? "Your hostel and its rooms. Publishing requires an administrator."
              : "All hostels - publish them to make them visible to students."}
          </p>
        </div>
        {canCreate && <HostelDialog />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hostel listings</CardTitle>
          <CardDescription>
            {hostels.length} hostel{hostels.length === 1 ? "" : "s"} · students
            only see published hostels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rooms</TableHead>
                <TableHead className="text-right">From</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hostels.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No hostels found.
                  </TableCell>
                </TableRow>
              )}
              {hostels.map((hostel) => {
                const fromPrice = hostel.rooms.length
                  ? Math.min(...hostel.rooms.map((r) => r.pricePerSemester))
                  : null;
                return (
                  <TableRow key={hostel.id}>
                    <TableCell className="font-medium">{hostel.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {hostel.location}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={hostel.type === "UNIVERSITY" ? "default" : "secondary"}
                      >
                        {hostel.type === "UNIVERSITY" ? "On-campus" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{hostel.rooms.length}</TableCell>
                    <TableCell className="text-right">
                      {fromPrice !== null
                        ? `GH₵ ${fromPrice.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {hostel.manager?.name ?? "-"}
                    </TableCell>
                    <TableCell>
                      {hostel.isApproved ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="outline">Unpublished</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <HostelDialog
                          hostel={{
                            id: hostel.id,
                            name: hostel.name,
                            type: hostel.type,
                            location: hostel.location,
                            contactNumber: hostel.contactNumber,
                            description: hostel.description,
                            facilities: hostel.facilities,
                            latitude: hostel.latitude,
                            longitude: hostel.longitude,
                          }}
                        />
                        <RoomsDialog
                          hostelId={hostel.id}
                          hostelName={hostel.name}
                          rooms={hostel.rooms}
                        />
                        {/* Keyed on the image so an upload remounts it with the
                            fresh photo. */}
                        <HostelImageDialog
                          key={`${hostel.id}:${hostel.featuredImage ?? "none"}`}
                          hostelId={hostel.id}
                          hostelName={hostel.name}
                          currentImage={hostel.featuredImage}
                        />
                        {session.role === "ADMIN" ? (
                          <>
                            {/* Keyed on the manager so a save remounts it with
                                the freshly assigned value. */}
                            <HostelManagerDialog
                              key={`${hostel.id}:${hostel.manager?.id ?? "none"}`}
                              hostelId={hostel.id}
                              hostelName={hostel.name}
                              currentManagerId={hostel.manager?.id ?? null}
                              currentManagerName={hostel.manager?.name ?? null}
                              candidates={managerCandidates}
                            />
                            {/* Keyed on approval state so the Publish/Unpublish
                                label reflects the saved state after revalidation. */}
                            <HostelApprovalButton
                              key={`${hostel.id}:${hostel.isApproved}`}
                              hostelId={hostel.id}
                              isApproved={hostel.isApproved}
                            />
                            <DeleteHostelButton hostelId={hostel.id} />
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Publish: admin only
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
