import { describe, it, expect } from "vitest";
import { JAM_SONGS, parseYoutubeId, songsInKey, youtubeEmbedUrl } from "../music/jam-songs";
import { DEFAULT_ROADMAP } from "../music/roadmap";

describe("jam songs", () => {
  it("has unique ids", () => {
    expect(new Set(JAM_SONGS.map((s) => s.id)).size).toBe(JAM_SONGS.length);
  });
  it("offers songs for every key on the roadmap", () => {
    for (const scale of DEFAULT_ROADMAP) expect(songsInKey(scale).length, `${scale.key} ${scale.mode}`).toBeGreaterThanOrEqual(3);
  });
  it("matches minor keys by pitch, in either spelling", () => {
    expect(songsInKey({ key: "Db", mode: "natural-minor" }).map((s) => s.id)).toEqual(songsInKey({ key: "C#", mode: "harmonic-minor" }).map((s) => s.id));
    expect(songsInKey({ key: "C", mode: "natural-minor" }).every((s) => s.mode === "minor")).toBe(true);
  });
  it("reads a video id out of the links people paste", () => {
    expect(parseYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYoutubeId("https://vimeo.com/12345")).toBeNull();
    expect(parseYoutubeId("not a link")).toBeNull();
    expect(parseYoutubeId("")).toBeNull();
  });
  it("embeds through the privacy domain without autoplay", () => {
    const url = youtubeEmbedUrl("dQw4w9WgXcQ");
    expect(url.startsWith("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(true);
    expect(url).not.toContain("autoplay=1");
  });
});
