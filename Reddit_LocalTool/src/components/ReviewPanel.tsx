import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProfileBundle } from "@/lib/data/queries";

interface AiSummary {
  summary?: string;
  pros?: string[];
  cons?: string[];
  sentiment_score?: number;
  complaint_tags?: string[];
}

export function ReviewPanel({ bundle }: { bundle: ProfileBundle }) {
  const ai = bundle.aiSummary as AiSummary | null;
  const notes = bundle.reports.filter((r) => r.note && r.note.trim());
  const gReviews = bundle.googleReviews.filter((r) => r.text && r.text.trim());

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            Student reviews{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({notes.length} notes · {gReviews.length} Google reviews)
            </span>
          </span>
          {ai?.sentiment_score != null && (
            <Badge variant={ai.sentiment_score >= 0 ? "default" : "destructive"}>
              sentiment {ai.sentiment_score > 0 ? "+" : ""}
              {ai.sentiment_score.toFixed(2)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ai ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            {ai.summary && <p className="mb-2">{ai.summary}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {ai.pros && ai.pros.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-emerald-600">Pros</p>
                  <ul className="list-disc pl-4 text-xs">
                    {ai.pros.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ai.cons && ai.cons.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-red-500">Cons</p>
                  <ul className="list-disc pl-4 text-xs">
                    {ai.cons.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {ai.complaint_tags && ai.complaint_tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {ai.complaint_tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No AI summary yet — run the summary batch from Admin.
          </p>
        )}

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {notes.map((r) => (
            <div key={r.id} className="rounded border p-2 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {r.layoutRaw && <span>{r.layoutRaw}</span>}
                {r.rentReported != null && <span>${r.rentReported}/mo</span>}
                {r.signingYear && <span>signed {r.signingYear}</span>}
                {!!r.doubleOccupancy && <Badge variant="outline">shared room</Badge>}
                {!!r.outlierFlag && (
                  <Badge variant="destructive" className="line-through">
                    outlier
                  </Badge>
                )}
              </div>
              <p className={r.outlierFlag ? "text-muted-foreground line-through" : ""}>{r.note}</p>
            </div>
          ))}
          {gReviews.map((r) => (
            <div key={r.id} className="rounded border border-dashed p-2 text-sm">
              <div className="mb-1 text-xs text-muted-foreground">
                Google · {r.rating}★ · {r.relativeTime}
              </div>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SurveyPanel({ bundle }: { bundle: ProfileBundle }) {
  const sv = bundle.surveys;
  if (sv.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const s of sv) for (const c of s.complaints ?? []) counts[c] = (counts[c] ?? 0) + 1;
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
  const maint = sv.filter((s) => s.maintenanceRating != null);
  const maintAvg =
    maint.length > 0
      ? maint.reduce((a, s) => a + s.maintenanceRating!, 0) / maint.length
      : null;
  const max = sorted[0]?.[1] ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Survey complaints{" "}
          <span className="text-sm font-normal text-muted-foreground">({sv.length} surveys)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {sorted.map(([tag, count]) => (
          <div key={tag} className="flex items-center gap-2 text-xs">
            <span className="w-32 shrink-0">{tag}</span>
            <div className="h-2 flex-1 rounded bg-muted">
              <div
                className="h-2 rounded bg-chart-1"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right tabular-nums text-muted-foreground">{count}</span>
          </div>
        ))}
        {maintAvg != null && (
          <p className="pt-2 text-xs text-muted-foreground">
            Maintenance rating: {maintAvg.toFixed(1)}/10 (n={maint.length})
          </p>
        )}
      </CardContent>
    </Card>
  );
}
