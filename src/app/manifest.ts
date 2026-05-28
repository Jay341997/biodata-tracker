import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Biodata Tracker",
    short_name: "Biodata",
    description: "Track biodata uploads, follow-ups, and recruitment workflow.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/file.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/window.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
