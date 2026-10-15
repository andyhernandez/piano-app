import { describe, expect, it } from "vitest";
import { tracksInKey, type LibraryTrack } from "../library/tracks";

const t = (id: string, key: LibraryTrack["key"], mode: LibraryTrack["mode"]): LibraryTrack => ({ id, title: id, artist: null, genre: null, key, mode, bpm: 90, level: null, duration_sec: null, audio_url: `https://x/${id}.mp3`, cover_url: null });

describe("library tracks in the session key", () => {
  const tracks = [t("g", "G", "major"), t("gb", "Gb", "major"), t("em", "E", "minor"), t("none", null, null)];

  it("matches the key and mode", () => {
    expect(tracksInKey(tracks, { key: "G", mode: "major" }).map((x) => x.id)).toEqual(["g"]);
  });

  it("treats enharmonic keys as the same key", () => {
    expect(tracksInKey(tracks, { key: "F#", mode: "major" }).map((x) => x.id)).toEqual(["gb"]);
  });

  it("gives natural and harmonic minor the minor tracks", () => {
    expect(tracksInKey(tracks, { key: "E", mode: "harmonic-minor" }).map((x) => x.id)).toEqual(["em"]);
    expect(tracksInKey(tracks, { key: "E", mode: "natural-minor" }).map((x) => x.id)).toEqual(["em"]);
  });

  it("leaves out tracks with no key", () => {
    expect(tracksInKey(tracks, { key: "C", mode: "major" })).toEqual([]);
  });
});
