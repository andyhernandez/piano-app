import type { PitchClass, ScaleId } from "../types";
import { pcToMidi } from "./notes";

/*
 * Songs to play along with in the "Your own" block: well-known tunes in the session key, each with the loop of
 * chords that carries it. The list ships without video ids — YouTube ids can't be curated safely offline, so
 * the first time a song is opened the player asks for the link and remembers it for that child.
 */

export interface JamSong {
  id: string;
  title: string;
  artist: string;
  key: PitchClass;
  mode: "major" | "minor";
  /** The loop to solo over, as written on a lead sheet. */
  chords: string;
}

const song = (id: string, title: string, artist: string, key: PitchClass, mode: "major" | "minor", chords: string): JamSong => ({ id, title, artist, key, mode, chords });

export const JAM_SONGS: JamSong[] = [
  // C major
  song("let-it-be", "Let It Be", "The Beatles", "C", "major", "C · G · Am · F"),
  song("imagine", "Imagine", "John Lennon", "C", "major", "C · Cmaj7 · F"),
  song("lean-on-me", "Lean on Me", "Bill Withers", "C", "major", "C · F · C · G"),
  song("piano-man", "Piano Man", "Billy Joel", "C", "major", "C · G · Am · F · G"),
  song("ho-hey", "Ho Hey", "The Lumineers", "C", "major", "C · F · Am · G"),
  song("stay-with-me", "Stay With Me", "Sam Smith", "C", "major", "Am · F · C"),
  song("count-on-me", "Count on Me", "Bruno Mars", "C", "major", "C · Em · Am · G · F"),
  song("hallelujah", "Hallelujah", "Leonard Cohen", "C", "major", "C · Am · F · G"),
  // G major
  song("knockin", "Knockin' on Heaven's Door", "Bob Dylan", "G", "major", "G · D · Am · G · D · C"),
  song("brown-eyed-girl", "Brown Eyed Girl", "Van Morrison", "G", "major", "G · C · G · D"),
  song("shallow", "Shallow", "Lady Gaga & Bradley Cooper", "G", "major", "Em · D · G · C"),
  song("ring-of-fire", "Ring of Fire", "Johnny Cash", "G", "major", "G · C · G · D"),
  song("shake-it-off", "Shake It Off", "Taylor Swift", "G", "major", "Am · C · G"),
  song("hey-ya", "Hey Ya!", "OutKast", "G", "major", "G · C · D · E"),
  song("blackbird", "Blackbird", "The Beatles", "G", "major", "G · Am7 · G/B · C"),
  // D major
  song("canon-in-d", "Canon in D", "Pachelbel", "D", "major", "D · A · Bm · F♯m · G · D · G · A"),
  song("thinking-out-loud", "Thinking Out Loud", "Ed Sheeran", "D", "major", "D · G · A"),
  song("with-or-without-you", "With or Without You", "U2", "D", "major", "D · A · Bm · G"),
  song("blowin-in-the-wind", "Blowin' in the Wind", "Bob Dylan", "D", "major", "D · G · A"),
  song("love-story", "Love Story", "Taylor Swift", "D", "major", "D · A · Bm · G"),
  song("ode-to-joy", "Ode to Joy", "Beethoven", "D", "major", "D · A · D"),
  song("sweet-home-alabama", "Sweet Home Alabama", "Lynyrd Skynyrd", "D", "major", "D · C · G"),
  // A major
  song("stand-by-me", "Stand by Me", "Ben E. King", "A", "major", "A · F♯m · D · E"),
  song("here-comes-the-sun", "Here Comes the Sun", "The Beatles", "A", "major", "A · D · E"),
  song("country-roads", "Take Me Home, Country Roads", "John Denver", "A", "major", "A · E · F♯m · D"),
  song("three-little-birds", "Three Little Birds", "Bob Marley", "A", "major", "A · D · E"),
  song("someone-like-you", "Someone Like You", "Adele", "A", "major", "A · C♯m · F♯m · D"),
  song("chasing-cars", "Chasing Cars", "Snow Patrol", "A", "major", "A · E · D"),
  song("river-flows-in-you", "River Flows in You", "Yiruma", "A", "major", "F♯m · D · A · E"),
  song("halo", "Halo", "Beyoncé", "A", "major", "A · Bm · F♯m · D"),
  // E major
  song("dont-stop-believin", "Don't Stop Believin'", "Journey", "E", "major", "E · B · C♯m · A"),
  song("photograph", "Photograph", "Ed Sheeran", "E", "major", "E · C♯m · A · B"),
  song("hey-soul-sister", "Hey, Soul Sister", "Train", "E", "major", "E · B · C♯m · A"),
  song("love-yourself", "Love Yourself", "Justin Bieber", "E", "major", "E · A · E · C♯m"),
  song("lovely-day", "Lovely Day", "Bill Withers", "E", "major", "E · G♯m · A"),
  song("anti-hero", "Anti-Hero", "Taylor Swift", "E", "major", "E · B · C♯m · A"),
  // F major
  song("hey-jude", "Hey Jude", "The Beatles", "F", "major", "F · C · C7 · F · B♭ · F · C · F"),
  song("yesterday", "Yesterday", "The Beatles", "F", "major", "F · Em · A7 · Dm"),
  song("free-fallin", "Free Fallin'", "Tom Petty", "F", "major", "F · B♭ · F · C"),
  song("the-scientist", "The Scientist", "Coldplay", "F", "major", "Dm · B♭ · F · C"),
  song("just-the-way-you-are", "Just the Way You Are", "Bruno Mars", "F", "major", "F · Dm · B♭ · F"),
  song("dont-stop-me-now", "Don't Stop Me Now", "Queen", "F", "major", "F · Am · Dm · Gm · C"),
  song("blank-space", "Blank Space", "Taylor Swift", "F", "major", "F · Am · Dm · B♭"),
  // B♭ major
  song("a-thousand-years", "A Thousand Years", "Christina Perri", "Bb", "major", "B♭ · Gm · E♭ · F"),
  song("rocket-man", "Rocket Man", "Elton John", "Bb", "major", "Gm · C · E♭ · B♭"),
  song("bohemian-rhapsody", "Bohemian Rhapsody", "Queen", "Bb", "major", "B♭ · Gm · Cm · F"),
  song("roar", "Roar", "Katy Perry", "Bb", "major", "B♭ · Cm · Gm · E♭"),
  song("drivers-license", "drivers license", "Olivia Rodrigo", "Bb", "major", "B♭ · F · Gm · E♭"),
  // E♭ major
  song("fix-you", "Fix You", "Coldplay", "Eb", "major", "E♭ · B♭ · Cm · A♭"),
  song("your-song", "Your Song", "Elton John", "Eb", "major", "E♭ · A♭ · B♭ · Gm · Cm"),
  song("clocks", "Clocks", "Coldplay", "Eb", "major", "E♭ · B♭m · Fm"),
  // A♭ major
  song("perfect", "Perfect", "Ed Sheeran", "Ab", "major", "A♭ · Fm · D♭ · E♭"),
  song("all-of-me", "All of Me", "John Legend", "Ab", "major", "Fm · D♭ · A♭ · E♭"),
  song("viva-la-vida", "Viva la Vida", "Coldplay", "Ab", "major", "D♭ · E♭ · A♭ · Fm"),
  song("let-it-go", "Let It Go", "Frozen", "Ab", "major", "A♭ · E♭ · Fm · D♭"),
  song("firework", "Firework", "Katy Perry", "Ab", "major", "A♭ · B♭m · Fm · D♭"),
  // D♭ major
  song("someone-you-loved", "Someone You Loved", "Lewis Capaldi", "Db", "major", "D♭ · A♭ · B♭m · G♭"),
  song("riptide", "Riptide", "Vance Joy", "Db", "major", "B♭m · G♭ · D♭"),
  song("clair-de-lune", "Clair de Lune", "Debussy", "Db", "major", "D♭ · G♭ · A♭"),
  // A minor
  song("fur-elise", "Für Elise", "Beethoven", "A", "minor", "Am · E7 · Am"),
  song("stairway-to-heaven", "Stairway to Heaven", "Led Zeppelin", "A", "minor", "Am · C · D · F"),
  song("house-of-the-rising-sun", "House of the Rising Sun", "The Animals", "A", "minor", "Am · C · D · F · Am · C · E"),
  song("aint-no-sunshine", "Ain't No Sunshine", "Bill Withers", "A", "minor", "Am · Em · G · Am"),
  song("hit-the-road-jack", "Hit the Road Jack", "Ray Charles", "A", "minor", "Am · G · F · E"),
  song("losing-my-religion", "Losing My Religion", "R.E.M.", "A", "minor", "Am · Em · Am · Em · Dm · G"),
  song("hurt", "Hurt", "Johnny Cash", "A", "minor", "Am · C · D · Am"),
  song("radioactive", "Radioactive", "Imagine Dragons", "A", "minor", "Am · C · G · D"),
  song("flowers", "Flowers", "Miley Cyrus", "A", "minor", "Am · Dm · G · C"),
  // E minor
  song("seven-nation-army", "Seven Nation Army", "The White Stripes", "E", "minor", "Em · G · Em · D · C · B"),
  song("nothing-else-matters", "Nothing Else Matters", "Metallica", "E", "minor", "Em · D · C"),
  song("zombie", "Zombie", "The Cranberries", "E", "minor", "Em · C · G · D"),
  song("comptine", "Comptine d'un autre été", "Yann Tiersen", "E", "minor", "Em · G · Bm · D"),
  song("take-me-to-church", "Take Me to Church", "Hozier", "E", "minor", "Em · Am · C · G"),
  // D minor
  song("somebody-that-i-used-to-know", "Somebody That I Used to Know", "Gotye", "D", "minor", "Dm · C · Dm · C"),
  song("uptown-funk", "Uptown Funk", "Mark Ronson & Bruno Mars", "D", "minor", "Dm · G7"),
  song("lose-yourself", "Lose Yourself", "Eminem", "D", "minor", "Dm · B♭ · C · Dm"),
  song("toccata-and-fugue", "Toccata and Fugue", "Bach", "D", "minor", "Dm · A · Dm"),
  // G minor
  song("havana", "Havana", "Camila Cabello", "G", "minor", "Gm · E♭ · D7"),
  song("bad-guy", "bad guy", "Billie Eilish", "G", "minor", "Gm · Cm · D"),
  song("summer-vivaldi", "Summer (Four Seasons)", "Vivaldi", "G", "minor", "Gm · D · Gm"),
  // C minor
  song("rolling-in-the-deep", "Rolling in the Deep", "Adele", "C", "minor", "Cm · G · B♭ · A♭"),
  song("skyfall", "Skyfall", "Adele", "C", "minor", "Cm · A♭ · Fm · G"),
  song("toxic", "Toxic", "Britney Spears", "C", "minor", "Cm · E♭ · G"),
  song("fifth-symphony", "Symphony No. 5", "Beethoven", "C", "minor", "Cm · G · Cm"),
  // F minor
  song("blinding-lights", "Blinding Lights", "The Weeknd", "F", "minor", "Fm · D♭ · A♭ · E♭"),
  song("hello", "Hello", "Adele", "F", "minor", "Fm · A♭ · E♭ · D♭"),
  song("happy", "Happy", "Pharrell Williams", "F", "minor", "Fm7 · B♭7"),
  song("boulevard-of-broken-dreams", "Boulevard of Broken Dreams", "Green Day", "F", "minor", "Fm · A♭ · E♭ · B♭"),
  // B minor
  song("hotel-california", "Hotel California", "Eagles", "B", "minor", "Bm · F♯ · A · E · G · D · Em · F♯"),
  song("wicked-game", "Wicked Game", "Chris Isaak", "B", "minor", "Bm · A · E"),
  // F♯ minor
  song("wonderwall", "Wonderwall", "Oasis", "F#", "minor", "F♯m · A · E · B"),
  song("dance-monkey", "Dance Monkey", "Tones and I", "F#", "minor", "F♯m · E · D · C♯"),
  song("numb", "Numb", "Linkin Park", "F#", "minor", "F♯m · D · A · E"),
  // C♯ minor
  song("shape-of-you", "Shape of You", "Ed Sheeran", "C#", "minor", "C♯m · F♯m · A · B"),
  song("counting-stars", "Counting Stars", "OneRepublic", "C#", "minor", "C♯m · E · B · A"),
  song("moonlight-sonata", "Moonlight Sonata", "Beethoven", "C#", "minor", "C♯m · A · B · C♯m"),
  // B♭ minor
  song("believer", "Believer", "Imagine Dragons", "Bb", "minor", "B♭m · G♭ · D♭ · A♭"),
];

const samePitch = (a: PitchClass, b: PitchClass) => pcToMidi(a, 4) === pcToMidi(b, 4);

/** Songs in the session key. Natural and harmonic minor both take the minor list. */
export function songsInKey(scale: ScaleId): JamSong[] {
  const mode = scale.mode === "major" ? "major" : "minor";
  return JAM_SONGS.filter((s) => s.mode === mode && samePitch(s.key, scale.key));
}

export function jamSongById(id: string): JamSong | undefined {
  return JAM_SONGS.find((s) => s.id === id);
}

/** A YouTube search for the song, for the tab the parent finds the video in. */
export function youtubeSearchUrl(song: JamSong): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${song.artist}`)}`;
}

/** The 11-character video id from a pasted YouTube link (watch, share, shorts, embed) or a bare id. */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.includes("://") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      id = m ? m[1] : u.searchParams.get("v");
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Privacy-enhanced embed that plays inline on the iPad and never autoplays. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1`;
}
