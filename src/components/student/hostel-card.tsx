"use client";

import Link from "next/link";
import Image from "next/image";
import { BedDouble, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FacilityBadges } from "@/components/student/facility-badges";
import { isRoomBookable } from "@/lib/availability";

export type HostelWithRooms = {
  id: string;
  name: string;
  location: string;
  description: string | null;
  type: "UNIVERSITY" | "PRIVATE";
  facilities: string | null;
  featuredImage: string | null;
  latitude: number | null;
  longitude: number | null;
  rooms: {
    id: string;
    capacity: number;
    pricePerSemester: number;
    status: "AVAILABLE" | "MAINTENANCE" | "CLOSED";
    bookings: { id: string }[];
  }[];
};

export function HostelCard({
  hostel,
  priority = false,
}: {
  hostel: HostelWithRooms;
  /** First card on the landing page - the LCP element - loads eagerly. */
  priority?: boolean;
}) {
  const availableRooms = hostel.rooms.filter((room) =>
    isRoomBookable(room.status, room.capacity, room.bookings.length),
  );

  const fromPrice = availableRooms.length
    ? Math.min(...availableRooms.map((r) => r.pricePerSemester))
    : null;

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {hostel.featuredImage && (
        <Link
          href={`/hostels/${hostel.id}`}
          className="relative block aspect-[16/8] overflow-hidden bg-muted"
          tabIndex={-1}
        >
          <Image
            src={hostel.featuredImage}
            alt={`${hostel.name} building`}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-105"
          />
        </Link>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            <Link
              href={`/hostels/${hostel.id}`}
              className="hover:text-primary hover:underline underline-offset-4"
            >
              {hostel.name}
            </Link>
          </CardTitle>
          <Badge variant={hostel.type === "UNIVERSITY" ? "default" : "secondary"}>
            {hostel.type === "UNIVERSITY" ? "On-campus" : "Private"}
          </Badge>
        </div>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" />
          {hostel.location}
        </p>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
        <p className="line-clamp-2">{hostel.description ?? "No description yet."}</p>
        <FacilityBadges facilities={hostel.facilities} />
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm">
          <BedDouble className="size-4 shrink-0 text-muted-foreground" />
          {availableRooms.length} room{availableRooms.length === 1 ? "" : "s"} open
        </span>
        <div className="text-right">
          {fromPrice !== null && (
            <p className="text-sm font-semibold">
              from GH₵ {fromPrice.toLocaleString()}/yr
            </p>
          )}
          <Button
            render={<Link href={`/hostels/${hostel.id}`} />}
            nativeButton={false}
            size="sm"
            className="mt-1"
          >
            View rooms
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
