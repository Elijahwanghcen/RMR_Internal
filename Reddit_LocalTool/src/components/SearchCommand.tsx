"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface Hit {
  id: string;
  name: string;
  zone: string | null;
  isCore: boolean;
}

export function SearchCommand() {
  const [open, setOpen] = React.useState(false);
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [q, setQ] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  React.useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const json = await res.json();
        setHits(json.hits ?? []);
      } catch {
        /* aborted */
      }
    }, 120);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q, open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-56 items-center justify-between rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        Search properties…
        <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search all properties (core + long tail)…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>No properties found.</CommandEmpty>
          <CommandGroup>
            {hits.map((h) => (
              <CommandItem
                key={h.id}
                value={h.id}
                onSelect={() => {
                  setOpen(false);
                  router.push(`/property/${h.id}`);
                }}
              >
                <span className="flex-1">{h.name}</span>
                {h.zone && <span className="mr-2 text-xs text-muted-foreground">{h.zone}</span>}
                {!h.isCore && <Badge variant="outline">long tail</Badge>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
