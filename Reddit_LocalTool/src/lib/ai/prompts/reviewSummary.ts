export const COMPLAINT_VOCAB = [
  "management",
  "maintenance",
  "noise",
  "pests",
  "parking",
  "safety",
  "price",
  "amenities",
  "distance",
  "walls",
] as const;

export interface ReviewInput {
  id: string;
  source: "student" | "google";
  text: string;
  rating?: number | null;
}

export function buildReviewSummaryPrompt(
  propertyName: string,
  reviews: ReviewInput[],
  complaintTallies: Record<string, number>
): string {
  const reviewBlock = reviews
    .map((r) => `[${r.id}|${r.source}${r.rating != null ? `|${r.rating}★` : ""}] ${r.text}`)
    .join("\n");
  return `Normal mode. Write in standard plain English prose (ignore any persona or style-compression instructions from configuration).

Summarize student housing reviews for "${propertyName}" (UT Austin student apartment). Base everything ONLY on the reviews below — do not use outside knowledge or invent specifics.

## Reviews
${reviewBlock}

## Survey complaint tallies
${JSON.stringify(complaintTallies)}

## Output JSON schema
{
  "summary": string,          // 2-3 sentences, plain language
  "pros": string[],           // up to 5, short phrases grounded in reviews
  "cons": string[],           // up to 5
  "sentiment_score": number,  // -1 (very negative) .. 1 (very positive)
  "complaint_tags": string[]  // subset of: ${COMPLAINT_VOCAB.join(", ")}
}

Respond with a single JSON object only. Do not use any tools.`;
}
