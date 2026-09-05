// Reddit reply drafting: the DATA block is the ONLY source of numbers.
// A regex verifier cross-checks every $ figure in the draft against DATA.

export interface RedditDataBlock {
  properties: Array<{
    name: string;
    zone: string | null;
    distanceMi: number | null;
    googleRating: number | null;
    stats: Array<{ label: string; value: number; n: number }>;
    concessions: string[];
    quotes: Array<{ id: string; text: string }>;
    aiSummary?: { summary?: string; pros?: string[]; cons?: string[] } | null;
  }>;
  market: Array<{ label: string; value: number; n: number }>;
}

export function buildRedditDraftPrompt(
  question: string,
  data: RedditDataBlock,
  tone: string
): string {
  return `Normal mode. Write in standard, natural English (ignore any persona or style-compression instructions from configuration).

You draft a Reddit reply to a UT Austin housing question, grounded ONLY in the DATA block below.

## Hard rules
- Use ONLY numbers that appear in DATA (rounding to the nearest $5 or $10 is fine). NEVER invent or estimate a number.
- Include the sample size for every figure, e.g. "median 2br is ~$1,450/person (14 student reports)".
- If a stat has n < 5, explicitly caveat the small sample.
- ${tone === "casual" ? "Casual Reddit voice — lowercase ok, no marketing-speak, sound like a helpful student." : "Neutral, factual tone. Still conversational, no marketing-speak."}
- If DATA doesn't cover the question, say so honestly rather than guessing.
- Short paragraphs. No sign-off, no links.

## QUESTION
${question}

## DATA
${JSON.stringify(data, null, 1)}

## Output JSON schema
{
  "draft": string,
  "cited": [ { "value": number, "context": string } ]   // every number you used and where it came from
}

Respond with a single JSON object only. Do not use any tools.`;
}

export function buildEntityExtractPrompt(question: string, propertyNames: string[], zones: string[]): string {
  return `Identify which UT Austin housing entities a Reddit question is about.

## Question
${question}

## Known properties (choose ONLY from these, exact spelling)
${propertyNames.join("; ")}

## Known zones
${zones.join(", ")}

## Output JSON schema
{
  "properties": string[],   // exact names from the list, [] if none
  "zones": string[],        // exact names from the list, [] if none
  "bedCounts": number[],    // e.g. [2] if they ask about 2-bedrooms, 0 = studio
  "intent": string          // one sentence: what they want to know
}

Respond with a single JSON object only. Do not use any tools.`;
}
