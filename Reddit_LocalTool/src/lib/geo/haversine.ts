export const UT_TOWER = { lat: 30.2862, lng: -97.7394 };

const EARTH_RADIUS_MI = 3958.8;

export function haversineMi(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

export function distanceToCampusMi(lat: number, lng: number): number {
  return haversineMi(lat, lng, UT_TOWER.lat, UT_TOWER.lng);
}
