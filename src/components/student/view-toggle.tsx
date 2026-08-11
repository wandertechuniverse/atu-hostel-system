"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LayoutGrid, Map as MapIcon } from "lucide-react";
import { HostelCard, type HostelWithRooms } from "@/components/student/hostel-card";
import type { MapHostel } from "@/components/student/hostel-map";
import { isRoomBookable } from "@/lib/availability";

// Leaflet touches `window`, so it is only loaded on the client - and only
// when the Map tab is actually active.
const HostelMap = dynamic(
  () =>
    import("@/components/student/hostel-map").then((m) => m.HostelMap),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-xl border bg-muted" /> },
);

/**
 * Grid/Map toggle. The keyed card list is rendered here, inside the client
 * component: JSX built in a Server Component and passed through the RSC
 * boundary loses its element keys in React 19's serialization, which
 * produced spurious "unique key" warnings. Plain data props serialize fine,
 * so `hostels` is passed as data and mapped on this side.
 */
export function ViewToggle({ hostels }: { hostels: HostelWithRooms[] }) {
  const [view, setView] = useState<"grid" | "map">("grid");

  const mapHostels: MapHostel[] = hostels
    .map((hostel) => {
      const available = hostel.rooms.filter((room) =>
        isRoomBookable(room.status, room.capacity, room.bookings.length),
      );
      return {
        id: hostel.id,
        name: hostel.name,
        location: hostel.location,
        featuredImage: hostel.featuredImage,
        fromPrice: available.length
          ? Math.min(...available.map((r) => r.pricePerSemester))
          : null,
        latitude: hostel.latitude,
        longitude: hostel.longitude,
      };
    })
    .filter(
      (h): h is MapHostel =>
        typeof h.latitude === "number" && typeof h.longitude === "number",
    );

  const tab = (value: "grid" | "map", label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      onClick={() => setView(value)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
        view === value
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-4 flex justify-end gap-1">
        {tab("grid", "Grid", LayoutGrid)}
        {tab("map", "Map", MapIcon)}
      </div>
      {view === "grid" ? (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hostels.map((hostel, index) => (
            <HostelCard
              key={hostel.id}
              hostel={hostel}
              priority={index === 0}
            />
          ))}
          {hostels.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              No hostels match your filters - try widening the search.
            </div>
          )}
        </section>
      ) : (
        <HostelMap hostels={mapHostels} />
      )}
    </div>
  );
}
