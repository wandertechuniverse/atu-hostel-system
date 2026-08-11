import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATU Hostel Booking",
    short_name: "ATU Hostels",
    description:
      "Search and book hostel rooms around Accra Technical University.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a6cdb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
