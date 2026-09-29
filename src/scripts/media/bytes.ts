/**
 * bytes.ts · polish r1 (perf). One download per GIF file, however many parts of the page want its bytes.
 *
 * The Highlights player warms a step's GIF ahead of time, then mounts it on an <img>, then may decode its poster
 * frame on a canvas: three consumers that each used to start their own request for the same 10 MB file (an in-flight
 * fetch is not shared with an <img> or with a second fetch, and a cancelled <img> leaves nothing in the HTTP cache).
 * Here a src is fetched ONCE into a Blob; the <img> shows it through an object URL and the poster decoder reads the
 * same Blob. `release(src)` drops both when the file is parked (beyond three viewports), so the bytes are not held.
 */

interface Entry { blob: Promise<Blob | null>; url?: string; ctl: AbortController }
const cache = new Map<string, Entry>();

/** Start (or join) the one download of `src`. Resolves null on a network error or when released first. */
export function load(src: string): Promise<Blob | null> {
  let e = cache.get(src);
  if (!e) {
    const ctl = new AbortController();
    const blob = fetch(src, { signal: ctl.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null);
    e = { blob, ctl };
    cache.set(src, e);
    // a failed download is forgotten, so a later Play can try again
    void blob.then((b) => { if (!b && cache.get(src) === e) cache.delete(src); });
  }
  return e.blob;
}

/** The download of `src` if one was started (finished or not); never starts one. */
export const peek = (src: string): Promise<Blob | null> | undefined => cache.get(src)?.blob;

/** An object URL for `src`'s bytes (downloading them if needed); null when the download failed. */
export async function objectUrl(src: string): Promise<string | null> {
  const b = await load(src);
  const e = cache.get(src);
  if (!b || !e) return null;
  e.url ??= URL.createObjectURL(b);
  return e.url;
}

/** Forget `src`: an unfinished download is cancelled, its object URL revoked (an <img> showing it keeps its frames). */
export function release(src: string): void {
  const e = cache.get(src);
  if (!e) return;
  cache.delete(src);
  e.ctl.abort();
  if (e.url) URL.revokeObjectURL(e.url);
}

/**
 * A byte stream of `src` for ONE frame decode (ImageDecoder): the shared download's Blob when there is one (no new
 * request), else a request of its own. `done()` ends it once the frame is decoded: the rest of the file is not needed,
 * so an own request is aborted there (a poster frame early in the file costs only the bytes up to it).
 */
export async function frameStream(src: string): Promise<{ body: ReadableStream<Uint8Array>; done: () => void } | null> {
  const shared = peek(src);
  if (shared) {
    const b = await shared;
    if (b) return { body: b.stream() as ReadableStream<Uint8Array>, done: () => {} };
  }
  const ctl = new AbortController();
  try {
    const res = await fetch(src, { signal: ctl.signal });
    if (!res.ok || !res.body) { ctl.abort(); return null; }
    return { body: res.body, done: () => ctl.abort() };
  } catch {
    return null;
  }
}
