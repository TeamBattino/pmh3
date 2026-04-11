/**
 * Upload a `Blob` to an S3 presigned PUT URL using XMLHttpRequest so callers
 * can track progress via `xhr.upload.onprogress`. `fetch` does not expose
 * upload progress in browsers, which is why we reach for XHR here.
 *
 * Retries up to `maxRetries` times with exponential backoff on network error
 * or 5xx responses. 4xx responses fail fast — those mean the presigned URL
 * is bad and retrying won't help.
 */

export type XhrPutOptions = {
  url: string;
  blob: Blob;
  contentType: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  maxRetries?: number;
};

const BACKOFFS_MS = [500, 1500, 4000];

export async function xhrPut(opts: XhrPutOptions): Promise<void> {
  const maxRetries = opts.maxRetries ?? 3;
  let attempt = 0;
  let lastError: Error | null = null;
  while (attempt < maxRetries) {
    try {
      await attemptPut(opts);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Don't retry fatal 4xx or aborts.
      if (
        lastError.name === "AbortError" ||
        (lastError as { fatal?: boolean }).fatal
      ) {
        throw lastError;
      }
      attempt += 1;
      if (attempt >= maxRetries) break;
      const delay = BACKOFFS_MS[Math.min(attempt - 1, BACKOFFS_MS.length - 1)]!;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error("xhrPut failed");
}

function attemptPut(opts: XhrPutOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", opts.url, true);
    xhr.setRequestHeader("Content-Type", opts.contentType);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      opts.onProgress?.(Math.min(100, Math.max(0, pct)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        opts.onProgress?.(100);
        resolve();
      } else {
        const err = new Error(`PUT failed: ${xhr.status} ${xhr.statusText}`);
        if (xhr.status >= 400 && xhr.status < 500) {
          (err as { fatal?: boolean }).fatal = true;
        }
        reject(err);
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => {
      const err = new Error("Upload aborted");
      err.name = "AbortError";
      reject(err);
    };

    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
        return;
      }
      opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(opts.blob);
  });
}
