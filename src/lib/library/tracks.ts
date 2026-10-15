import type { PitchClass, ScaleId } from "../types";
import { pcIndex } from "../music/notes";
import { CLOUD_URL } from "../sync/defaults";

/**
 * Backing tracks from the EasyKeys admin's music library: uploaded or Suno-generated audio that an admin
 * has published. They come from the EasyKeys cloud; NEXT_PUBLIC_LIBRARY_URL points elsewhere for local work.
 */
export const LIBRARY_URL = (process.env.NEXT_PUBLIC_LIBRARY_URL || CLOUD_URL).replace(/\/+$/, "");

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string | null;
  genre: string | null;
  key: PitchClass | null;
  mode: "major" | "minor" | null;
  bpm: number | null;
  level: number | null;
  duration_sec: number | null;
  audio_url: string;
  cover_url: string | null;
}

let cache: { at: number; tracks: LibraryTrack[] } | null = null;
const FRESH_MS = 5 * 60_000;

/** Every published track. Cached for five minutes; an unreachable library is an empty one. */
export async function fetchLibrary(fetcher: typeof fetch = fetch): Promise<LibraryTrack[]> {
  if (!LIBRARY_URL) return [];
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.tracks;
  try {
    const res = await fetcher(`${LIBRARY_URL}/api/tracks`, { headers: { Accept: "application/json" } });
    if (!res.ok) return cache?.tracks ?? [];
    const body = (await res.json()) as { data?: LibraryTrack[] };
    const tracks = (body.data ?? []).filter((t) => typeof t.audio_url === "string" && t.audio_url);
    cache = { at: Date.now(), tracks };
    return tracks;
  } catch {
    return cache?.tracks ?? [];
  }
}

/** Tracks for the session key: same pitch (G♭ matches F♯), and natural and harmonic minor both take minor. */
export function tracksInKey(tracks: LibraryTrack[], scale: ScaleId): LibraryTrack[] {
  const mode = scale.mode === "major" ? "major" : "minor";
  return tracks.filter((t) => t.key && t.mode === mode && pcIndex(t.key) === pcIndex(scale.key));
}

/** For tests. */
export function clearLibraryCache() {
  cache = null;
}
