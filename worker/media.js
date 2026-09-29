/**
 * worker/media.js · polish r1 (perf). Byte ranges for her local MP4s, whatever the static-asset layer does with them.
 *
 * Why: Safari plays an MP4 only when a `Range` request comes back `206 Partial Content`, and Chrome turns
 * `preload="metadata"` into a full download when it gets a `200`. Workers static assets do not document range support,
 * and the asset worker `wrangler dev` runs (miniflare's copy of workers-shared) ignores `Range` and answers 200 with the
 * whole file. wrangler.jsonc routes ONLY `/media/*.mp4` here (`run_worker_first`); every other request is served by
 * the asset layer directly and never runs this code.
 *
 * Behaviour (RFC 9110 §14): a single `bytes=a-b`, `bytes=a-` or `bytes=-n` range gets a 206 with Content-Range, sliced
 * from the asset's body as it streams (never buffered whole); an unsatisfiable one gets 416; `If-Range` that does not
 * match the asset's ETag, multi-range requests and non-GET/HEAD requests get the asset's own response. When the asset
 * layer already answered 206 (a future runtime that supports ranges), its response passes through untouched. Every
 * response keeps the asset's headers (the immutable Cache-Control from _headers, ETag, Content-Type) and says
 * `Accept-Ranges: bytes`.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** @param {ReadableStream<Uint8Array>} body @param {number} start @param {number} length */
function sliceStream(body, start, length) {
  let pos = 0;
  let left = length;
  return body.pipeThrough(new TransformStream({
    transform(chunk, ctl) {
      const from = Math.max(0, start - pos);
      pos += chunk.byteLength;
      if (from >= chunk.byteLength || left <= 0) return;
      const part = chunk.subarray(from, Math.min(chunk.byteLength, from + left));
      left -= part.byteLength;
      ctl.enqueue(part);
      if (left <= 0) ctl.terminate();
    },
  }));
}

/** @returns {{ start: number, end: number } | 'unsatisfiable' | null} */
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header ?? '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null; // absent, malformed or multi-range: the whole file
  let start, end;
  if (m[1] === '') { // suffix: the last n bytes
    const n = Number(m[2]);
    if (n === 0) return 'unsatisfiable';
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
    if (start >= size || end < start) return 'unsatisfiable';
  }
  return { start, end };
}

export default {
  /** @param {Request} request @param {{ ASSETS: { fetch: (r: Request) => Promise<Response> } }} env */
  async fetch(request, env) {
    const range = request.headers.get('Range');
    // the asset layer is asked first, Range and all: where it answers ranges itself (206) its answer passes through.
    // A HEAD is asked as a GET (its body is dropped below), so a HEAD with a Range learns the size like a GET does.
    const head = request.method === 'HEAD';
    const res = await env.ASSETS.fetch(new Request(request.url, { method: head ? 'GET' : request.method, headers: request.headers }));
    const headers = new Headers(res.headers);
    headers.set('Accept-Ranges', 'bytes');
    if (res.ok && !headers.has('Cache-Control')) headers.set('Cache-Control', IMMUTABLE);
    if (res.status === 206) {
      if (!head) return res;
      res.body?.cancel();
      return new Response(null, { status: 206, headers: res.headers });
    }
    // the asset layer may stream without a Content-Length header (wrangler dev does): then the file (≤ 15 MB, all of
    // her MP4s) is read once to learn its size, and sliced in memory
    let buffered = null;
    let size = Number(res.headers.get('Content-Length') ?? NaN);
    if (res.status === 200 && range && !(size > 0) && res.body) {
      buffered = new Uint8Array(await res.arrayBuffer());
      size = buffered.byteLength;
    }
    const ifRange = request.headers.get('If-Range');
    const etag = res.headers.get('ETag');
    const wantsRange = res.status === 200 && range && Number.isFinite(size) && size > 0
      && (request.method === 'GET' || request.method === 'HEAD') && (!ifRange || ifRange === etag);
    const r = wantsRange ? parseRange(range, size) : null;
    if (r === 'unsatisfiable') {
      if (!buffered) res.body?.cancel();
      headers.set('Content-Range', `bytes */${size}`);
      headers.delete('Content-Length');
      return new Response(null, { status: 416, headers });
    }
    if (!r) {
      if (head) { if (!buffered) res.body?.cancel(); return new Response(null, { status: res.status, statusText: res.statusText, headers }); }
      return new Response(buffered ?? res.body, { status: res.status, statusText: res.statusText, headers });
    }
    const length = r.end - r.start + 1;
    headers.set('Content-Range', `bytes ${r.start}-${r.end}/${size}`);
    headers.set('Content-Length', String(length));
    if (head || (!res.body && !buffered)) { if (!buffered) res.body?.cancel(); return new Response(null, { status: 206, headers }); }
    if (buffered) return new Response(buffered.subarray(r.start, r.end + 1), { status: 206, headers });
    // a fixed-length body keeps Content-Length on the wire (a plain TransformStream would be sent chunked)
    const FLS = /** @type {any} */ (globalThis).FixedLengthStream;
    const sliced = sliceStream(res.body, r.start, length);
    const body = FLS ? sliced.pipeThrough(new FLS(length)) : sliced;
    return new Response(body, { status: 206, headers });
  },
};
