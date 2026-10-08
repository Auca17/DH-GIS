"use client";

import { useEffect, useState } from "react";

export type DbStatus = "ok" | "offline" | "empty";

interface ApiState<T> {
  url: string; // which url this answer belongs to
  dbStatus: DbStatus | null;
  data: T | null;
  notFound: boolean;
}

// Reads one of our /api/trails routes. The routes answer { ok, dbStatus, data }.
export function useTrailApi<T>(url: string) {
  const [state, setState] = useState<ApiState<T> | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(url)
      .then(async (response) => {
        const body = await response.json();
        return {
          url,
          dbStatus: (body.dbStatus ?? null) as DbStatus | null,
          data: (body.data ?? null) as T | null,
          notFound: response.status === 404,
        };
      })
      .catch(() => ({ url, dbStatus: null, data: null, notFound: false }))
      .then((result) => {
        if (!cancelled) {
          setState(result);
        }
      });

    // If the url changes (or the screen closes) before the answer arrives, ignore the old answer.
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Still loading while we have no answer for the current url.
  if (state === null || state.url !== url) {
    return { loading: true, dbStatus: null, data: null, notFound: false };
  }
  return { loading: false, dbStatus: state.dbStatus, data: state.data, notFound: state.notFound };
}
