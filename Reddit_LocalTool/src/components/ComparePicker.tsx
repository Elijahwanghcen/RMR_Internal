"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function ComparePicker({
  options,
  selected,
}: {
  options: Array<{ id: string; name: string }>;
  selected: string[];
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");

  const apply = (ids: string[]) => {
    router.push(`/compare?ids=${ids.join(",")}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((id) => {
        const name = options.find((o) => o.id === id)?.name ?? id;
        return (
          <Badge key={id} variant="secondary" className="gap-1">
            {name}
            <button
              onClick={() => apply(selected.filter((s) => s !== id))}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </Badge>
        );
      })}
      {selected.length < 5 && (
        <select
          className="rounded-md border bg-background px-2 py-1 text-sm"
          value={value}
          onChange={(e) => {
            if (e.target.value) {
              apply([...selected, e.target.value]);
              setValue("");
            }
          }}
        >
          <option value="">+ add property…</option>
          {options
            .filter((o) => !selected.includes(o.id))
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );
}
