"use client";
import * as React from "react";
import { repo } from "@/lib/db/repo";
import type { Child, Session } from "@/lib/types";

/** Every profile's sessions, keyed by child id. Reloads when the set of profiles changes or `version` bumps. */
export function useHouseholdSessions(children: Child[], version = 0): Map<string, Session[]> {
  const ids = children.map((c) => c.id).join(",");
  const [map, setMap] = React.useState<Map<string, Session[]>>(() => new Map());
  React.useEffect(() => {
    let cancelled = false;
    const list = ids ? ids.split(",") : [];
    void Promise.all(list.map((id) => repo.listSessions(id, 200))).then((all) => {
      if (cancelled) return;
      const next = new Map<string, Session[]>();
      list.forEach((id, i) => next.set(id, all[i]));
      setMap(next);
    });
    return () => { cancelled = true; };
  }, [ids, version]);
  return map;
}
