// Light PII scrub applied to free-text notes before display and before any AI prompt.
// Original text is stored separately (note_raw) and never rendered or prompted.

const PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  // phone numbers: 512-555-1234, (512) 555 1234, 512.555.1234
  { re: /\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, replacement: "[phone redacted]" },
  // emails
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, replacement: "[email redacted]" },
  // unit/apt/room numbers: "unit 304", "apt 12B", "room 1104"
  { re: /\b(unit|apt|apartment|room|suite)\s*#?\s*\d+[a-z]?\b/gi, replacement: "[unit redacted]" },
  // named individuals: "ask for Maria", "talk to Jake", "named Sarah", "manager Karen"
  {
    re: /\b(ask for|talk to|speak to|named|manager named|agent named|my roommate)\s+([A-Z][a-z]+)\b/g,
    replacement: "$1 [name redacted]",
  },
];

export function redactNote(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw;
  for (const { re, replacement } of PATTERNS) {
    s = s.replace(re, replacement);
  }
  return s;
}
