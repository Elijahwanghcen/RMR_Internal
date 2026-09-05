"use client";

import * as React from "react";
import dynamic from "next/dynamic";

// Leaflet touches window -> client-only, no SSR.
const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="h-[72vh] animate-pulse rounded-md bg-muted" />,
});

interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: string | null;
  median: number | null;
  googleRating: number | null;
}

export default function MapPage() {
  const [pins, setPins] = React.useState<Pin[] | null>(null);

  React.useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then((j) => setPins(j.pins));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Map</h1>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>cheaper</span>
          <span className="flex">
            {["#fde3c4", "#f6b877", "#e8945a", "#c9722f", "#9a4f18"].map((c) => (
              <span key={c} className="h-3 w-6" style={{ background: c }} />
            ))}
          </span>
          <span>pricier</span>
          <span className="ml-2 flex items-center gap-1">
            <span className="h-3 w-3 rounded-full" style={{ background: "#9ca3af" }} /> no price
          </span>
        </div>
      </div>
      {pins ? <MapView pins={pins} /> : <div className="h-[72vh] animate-pulse rounded-md bg-muted" />}
    </div>
  );
}
