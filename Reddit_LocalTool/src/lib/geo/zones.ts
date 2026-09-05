// Zone assignment via ordered bounding boxes — first match wins.
// Boxes are data, not code; tune against the ingest zone-assignment report.

export interface ZoneBox {
  name: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

export const ZONES: ZoneBox[] = [
  { name: "West Campus", latMin: 30.278, latMax: 30.296, lngMin: -97.755, lngMax: -97.7405 },
  { name: "North Campus", latMin: 30.288, latMax: 30.305, lngMin: -97.7405, lngMax: -97.72 },
  { name: "Hyde Park", latMin: 30.297, latMax: 30.315, lngMin: -97.745, lngMax: -97.715 },
  { name: "Downtown", latMin: 30.259, latMax: 30.278, lngMin: -97.755, lngMax: -97.732 },
  { name: "East Austin", latMin: 30.25, latMax: 30.295, lngMin: -97.732, lngMax: -97.69 },
  { name: "Riverside", latMin: 30.22, latMax: 30.25, lngMin: -97.74, lngMax: -97.69 },
  { name: "Far West", latMin: 30.33, latMax: 30.37, lngMin: -97.79, lngMax: -97.745 },
];

export const FALLBACK_ZONE = "Other";

export function zoneFor(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return FALLBACK_ZONE;
  for (const z of ZONES) {
    if (lat >= z.latMin && lat <= z.latMax && lng >= z.lngMin && lng <= z.lngMax) {
      return z.name;
    }
  }
  return FALLBACK_ZONE;
}

export function zoneNames(): string[] {
  return [...ZONES.map((z) => z.name), FALLBACK_ZONE];
}
