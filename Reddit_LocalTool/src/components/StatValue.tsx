import { cn } from "@/lib/utils";

// The single place the n<3 rule lives.
export function SampleSizeBadge({ n }: { n: number }) {
  return (
    <span
      className={cn(
        "ml-1 rounded px-1 py-0.5 text-[10px] font-medium tabular-nums",
        n < 3 ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" : "bg-muted text-muted-foreground"
      )}
      title={n < 3 ? "Weak sample — treat with caution" : `${n} data points`}
    >
      n={n}
    </span>
  );
}

export function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return "—";
  return `$${Math.round(v).toLocaleString()}`;
}

export function StatValue({
  value,
  n,
  format = "currency",
  className,
}: {
  value: number | null | undefined;
  n: number;
  format?: "currency" | "number" | "percent" | "rating" | "miles";
  className?: string;
}) {
  const text =
    value == null
      ? "—"
      : format === "currency"
        ? fmtCurrency(value)
        : format === "percent"
          ? `${value.toFixed(1)}%`
          : format === "rating"
            ? value.toFixed(1)
            : format === "miles"
              ? `${value.toFixed(2)} mi`
              : Math.round(value).toLocaleString();
  return (
    <span className={cn(value != null && n < 3 && "text-muted-foreground/60", className)}>
      {text}
      {value != null && <SampleSizeBadge n={n} />}
    </span>
  );
}
