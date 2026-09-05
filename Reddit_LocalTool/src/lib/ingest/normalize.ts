// Name normalization for entity resolution.
// Conservative: strips noise words but keeps disambiguators like "House"/"Tower"/"Lofts".

const TRAILING_STOPWORDS = new Set([
  "apartments",
  "apartment",
  "apts",
  "apt",
  "condominiums",
  "condos",
  "condo",
  "luxury",
  "austin",
  "atx",
]);

export function normalizeName(raw: string): string {
  let s = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (s.startsWith("the ")) s = s.slice(4);

  const tokens = s.split(" ");
  while (tokens.length > 1 && TRAILING_STOPWORDS.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}
