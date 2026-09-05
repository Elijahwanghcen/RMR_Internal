// Crude lease-term classifier over the free-text `availability` field,
// so fall-signing vs immediate-move-in prices don't blend silently.

export type LeaseTerm = "full_term" | "academic_year" | "immediate" | "spring" | "unknown";

export function classifyLeaseTerm(availability: string | null | undefined): LeaseTerm {
  if (!availability) return "unknown";
  const s = availability.toLowerCase();
  if (/academic/.test(s)) return "academic_year";
  if (/full term|12[- ]month|fall\s*20\d\d/.test(s)) return "full_term";
  if (/immediate|now|move[- ]in ready|available today/.test(s)) return "immediate";
  if (/spring/.test(s)) return "spring";
  return "unknown";
}
