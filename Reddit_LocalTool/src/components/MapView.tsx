"use client";

import * as React from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import Link from "next/link";

interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: string | null;
  median: number | null;
  googleRating: number | null;
}

// Color by median per-person rent quantile. Sequential single hue (amber),
// light->dark = cheaper->pricier. Grey = no price.
function colorFor(median: number | null, breaks: number[]): string {
  if (median == null) return "#9ca3af";
  const ramp = ["#fde3c4", "#f6b877", "#e8945a", "#c9722f", "#9a4f18"];
  let i = 0;
  while (i < breaks.length && median > breaks[i]) i++;
  return ramp[Math.min(i, ramp.length - 1)];
}

export function MapView({ pins }: { pins: Pin[] }) {
  const medians = pins.map((p) => p.median).filter((m): m is number => m != null).sort((a, b) => a - b);
  const q = (f: number) => medians[Math.floor(medians.length * f)] ?? 0;
  const breaks = [q(0.2), q(0.4), q(0.6), q(0.8)];

  return (
    <MapContainer
      center={[30.2862, -97.7394]}
      zoom={14}
      style={{ height: "72vh", width: "100%", borderRadius: 8 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* UT Tower reference */}
      <CircleMarker center={[30.2862, -97.7394]} radius={6} pathOptions={{ color: "#2563eb", fillOpacity: 1 }}>
        <Popup>UT Tower</Popup>
      </CircleMarker>
      {pins.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={8}
          pathOptions={{
            color: "white",
            weight: 1.5,
            fillColor: colorFor(p.median, breaks),
            fillOpacity: 0.9,
          }}
        >
          <Popup>
            <div className="space-y-0.5">
              <Link href={`/property/${p.id}`} className="font-semibold text-blue-600">
                {p.name}
              </Link>
              <div className="text-xs">{p.zone}</div>
              <div className="text-xs">
                {p.median != null ? `Listed median ~$${Math.round(p.median)}/person` : "No listed price"}
                {p.googleRating != null && ` · ${p.googleRating}★`}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
