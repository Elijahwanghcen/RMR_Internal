import fs from "fs";
import { z } from "zod";

// Raw_data.json is an app export; only submissions/ratings/surveys are used.

// Self-reported numbers occasionally arrive as junk strings ("?") -> null.
const lenientNumber = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v == null || typeof v === "number") return v ?? null;
    const n = parseFloat(v.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : null;
  });

const submissionSchema = z.object({
  id: z.string(),
  hood: z.string(),
  layout: z.string().nullish(),
  rent: lenientNumber,
  note: z.string().nullish(),
  utils: z.boolean().nullish(),
  utilityCost: lenientNumber,
  parking: z.boolean().nullish(),
  parkingCost: lenientNumber,
  doubleOccupancy: z.boolean().nullish(),
  isOwnPlace: z.boolean().nullish(),
  signingMonth: z.string().nullish(),
  signingYear: z.union([z.string(), z.number()]).nullish(),
  createdAt: z.number().nullish(),
});

const ratingSchema = z.object({
  id: z.string(),
  building: z.string(),
  rating: z.number(),
  createdAt: z.number().nullish(),
});

const surveySchema = z.object({
  id: z.string(),
  building: z.string(),
  complaints: z.array(z.string()).nullish(),
  complaintOther: z.string().nullish(),
  maintenanceRating: z.number().nullish(),
  maintenanceNote: z.string().nullish(),
  elevatorCount: z.number().nullish(),
  elevatorUptime: z.number().nullish(),
  quality: z.string().nullish(),
  createdAt: z.number().nullish(),
});

const rawDataSchema = z.object({
  submissions: z.array(submissionSchema),
  ratings: z.array(ratingSchema),
  surveys: z.array(surveySchema),
});

export type RawSubmission = z.infer<typeof submissionSchema>;
export type RawRating = z.infer<typeof ratingSchema>;
export type RawSurvey = z.infer<typeof surveySchema>;
export type RawData = z.infer<typeof rawDataSchema>;

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

export function signingDateOf(s: RawSubmission): { year: number | null; date: string | null } {
  const yearStr = s.signingYear != null ? String(s.signingYear) : "";
  let year: number | null = yearStr.match(/^\d{4}$/) ? parseInt(yearStr, 10) : null;
  let month = s.signingMonth ? MONTHS[s.signingMonth.trim().toLowerCase()] ?? "01" : "01";

  // "Current Lease"/"Current Year" -> anchor to the submission timestamp
  if (year == null && /current/i.test(yearStr) && s.createdAt != null) {
    const d = new Date(s.createdAt);
    year = d.getUTCFullYear();
    month = String(d.getUTCMonth() + 1).padStart(2, "0");
  }
  if (year == null) return { year: null, date: null };
  return { year, date: `${year}-${month}-01` };
}

export function loadRawData(rawDataPath: string): RawData {
  const raw = JSON.parse(fs.readFileSync(rawDataPath, "utf8"));
  const parsed = rawDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Raw_data.json failed validation: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }
  return parsed.data;
}
