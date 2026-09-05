// Parses messy self-reported layout strings like "2 Bed / 2 Bath", "4bed 3 bath",
// "Studio", "Bed 3 / Bed 3". Unparseable -> nulls (excluded from per-bed stats).

export interface ParsedLayout {
  beds: number | null;
  baths: number | null;
}

export function parseLayout(raw: string | null | undefined): ParsedLayout {
  if (!raw) return { beds: null, baths: null };
  const s = raw.trim().toLowerCase();
  if (!s) return { beds: null, baths: null };

  if (/\bstudio\b/.test(s)) return { beds: 0, baths: 1 };

  const bedMatch = s.match(/(\d+)\s*(?:x\s*\d+\s*)?bed/);
  const bathMatch = s.match(/(\d+(?:\.\d+)?)\s*bath/);
  // "4x4"-style shorthand
  const xMatch = s.match(/^(\d+)\s*x\s*(\d+)$/);

  if (xMatch) {
    return { beds: parseInt(xMatch[1], 10), baths: parseFloat(xMatch[2]) };
  }

  const beds = bedMatch ? parseInt(bedMatch[1], 10) : null;
  const baths = bathMatch ? parseFloat(bathMatch[1]) : null;

  // Sanity: nobody reports a 30-bed unit.
  if (beds !== null && (beds < 0 || beds > 10)) return { beds: null, baths };
  return { beds, baths };
}
