"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export type MapHostel = {
  id: string;
  name: string;
  location: string;
  featuredImage: string | null;
  fromPrice: number | null;
  latitude: number;
  longitude: number;
};

/** Custom CSS pin (divIcon) - avoids Leaflet's broken default marker assets. */
const pinIcon = L.divIcon({
  className: "hbms-pin",
  html: '<div class="hbms-pin-inner"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 19],
  popupAnchor: [0, -18],
});

export function HostelMap({ hostels }: { hostels: MapHostel[] }) {
  return (
    <div className="h-[420px] overflow-hidden rounded-xl border">
      <MapContainer
        center={[5.5539, -0.207]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hostels.map((hostel) => (
          <Marker
            key={hostel.id}
            position={[hostel.latitude, hostel.longitude]}
            icon={pinIcon}
          >
            <Popup>
              <div className="w-56 space-y-2">
                {hostel.featuredImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hostel.featuredImage}
                    alt={`${hostel.name} building`}
                    className="h-24 w-full rounded-md object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold leading-tight">{hostel.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {hostel.location}
                  </p>
                </div>
                {hostel.fromPrice !== null && (
                  <p className="text-sm font-semibold">
                    from GH₵ {hostel.fromPrice.toLocaleString()}/yr
                  </p>
                )}
                <Link
                  href={`/hostels/${hostel.id}`}
                  className="inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  View details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
