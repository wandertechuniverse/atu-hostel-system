import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookingDialog } from "@/components/student/booking-dialog";
import { FacilityBadges } from "@/components/student/facility-badges";
import { availableBeds } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/hostels/[id]">): Promise<Metadata> {
  const { id } = await params;
  const hostel = await db.hostel.findUnique({
    where: { id },
    include: { rooms: { select: { pricePerSemester: true } } },
  });
  if (!hostel || !hostel.isApproved) return { title: "Hostel not found" };
  return {
    title: hostel.name,
    description:
      hostel.description ??
      `Rooms at ${hostel.name}, ${hostel.location} - ATU hostel booking.`,
    alternates: { canonical: `/hostels/${hostel.id}` },
    openGraph: {
      title: `${hostel.name} - rooms from GH₵ ${Math.min(...hostel.rooms.map((r) => r.pricePerSemester), 0).toLocaleString()}`,
      description:
        hostel.description ??
        `${hostel.name}, ${hostel.location} - ATU hostel booking.`,
      url: `/hostels/${hostel.id}`,
      type: "website",
    },
  };
}

export default async function HostelDetailPage({ params }: PageProps<"/hostels/[id]">) {
  const { id } = await params;
  const session = await getSession();
  const loggedInStudent = session.isLoggedIn && session.role === "STUDENT";

  const hostel = await db.hostel.findUnique({
    where: { id },
    include: {
      rooms: {
        include: {
          bookings: { where: { status: "CONFIRMED" }, select: { id: true } },
        },
        orderBy: { roomNumber: "asc" },
      },
    },
  });

  if (!hostel || !hostel.isApproved) notFound();

  const rooms = hostel.rooms.map((room) => ({
    ...room,
    available: availableBeds(room.capacity, room.bookings.length),
  }));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <Badge variant={hostel.type === "UNIVERSITY" ? "default" : "secondary"}>
              {hostel.type === "UNIVERSITY" ? "ATU On-Campus" : "Private Perimeter"}
            </Badge>
            {!hostel.isApproved && <Badge variant="outline">Pending approval</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{hostel.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-4" />
            {hostel.location}
            {hostel.contactNumber ? ` · ${hostel.contactNumber}` : ""}
          </p>
          {hostel.facilities && (
            <p className="mt-3 text-sm text-muted-foreground">
              {hostel.facilities
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {hostel.description && (
            <p className="mt-4 max-w-2xl text-muted-foreground">{hostel.description}</p>
          )}
          <div className="mt-4">
            <FacilityBadges facilities={hostel.facilities} />
          </div>
        </div>

        {hostel.featuredImage && (
          <div className="relative mb-8 aspect-[16/6] overflow-hidden rounded-2xl border bg-muted">
            <Image
              src={hostel.featuredImage}
              alt={`${hostel.name} building`}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}

        <h2 className="mb-3 text-xl font-semibold">Rooms</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead className="text-right">Price / year</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="font-medium">{room.roomNumber}</TableCell>
                <TableCell>{room.roomType}</TableCell>
                <TableCell>{room.capacity} beds</TableCell>
                <TableCell className="text-right">
                  GH₵ {room.pricePerSemester.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {room.status === "AVAILABLE" ? (
                    room.available > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {room.available} of {room.capacity}
                      </span>
                    ) : (
                      <span className="text-destructive">Full</span>
                    )
                  ) : (
                    <span className="text-muted-foreground">Unavailable</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {room.status === "AVAILABLE" && room.available > 0 && (
                    <BookingDialog
                      room={room}
                      requiresLogin={!loggedInStudent}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </main>
  );
}
