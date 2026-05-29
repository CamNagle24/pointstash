import type { MetadataRoute } from "next";

// Next 15 automatically serves this at /manifest.webmanifest. Edit values
// here rather than dropping a static file in /public.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PointStash",
    short_name: "PointStash",
    description: "All your fast-food rewards. One dashboard.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    categories: ["lifestyle", "food", "finance", "utilities"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Deals",
        url: "/dashboard/deals",
        description: "Browse active deals across all chains",
      },
      {
        name: "Redeem",
        url: "/dashboard/redeem",
        description: "See the best redemptions for your balances",
      },
    ],
  };
}
