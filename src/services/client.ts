export type ErrorKind =
  "missing" | "network" | "invalid" | "auth" | "forbidden" | "rate-limit";
export class ApiError extends Error {
  constructor(
    message: string,
    public kind: ErrorKind,
    public retryAt?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again.";
export const isAbort = (error: unknown) =>
  error instanceof Error && error.name === "AbortError";
const aborted = () => new DOMException("Request cancelled", "AbortError");
interface CacheEntry {
  value: unknown;
  expires: number;
  size: number;
}
const TTL = 5 * 60 * 1000;
const MAX_BYTES = 20 * 1024 * 1024;

/** One application session. GitHub requests are serialized; credentials never enter cache keys. */
export class ApiClient {
  private token = "";
  private generation = 0;
  private cache = new Map<string, CacheEntry>();
  private pending = new Map<string, Promise<unknown>>();
  private queue: Promise<unknown> = Promise.resolve();
  private pauseUntil = 0;
  private controllers = new Set<AbortController>();
  private cacheBytes = 0;
  setToken(token: string) {
    this.token = token.trim();
    this.generation++;
    this.pauseUntil = 0;
    for (const controller of Array.from(this.controllers)) controller.abort();
    this.clear("https://api.github.com/");
    this.pending.clear();
  }
  clear(prefix = "") {
    for (const [key, entry] of Array.from(this.cache))
      if (key.startsWith(prefix)) {
        this.cacheBytes -= entry.size;
        this.cache.delete(key);
      }
  }
  dispose() {
    for (const controller of Array.from(this.controllers)) controller.abort();
    this.pending.clear();
  }
  async get<T>(url: string, signal?: AbortSignal, refresh = false): Promise<T> {
    if (signal?.aborted) throw aborted();
    if (refresh) this.clear(url);
    const cached = this.cache.get(url);
    if (cached && cached.expires > Date.now()) {
      this.cache.delete(url);
      this.cache.set(url, cached);
      return cached.value as T;
    }
    // Only requests without a caller-owned lifetime are shared. Hook lifetimes are cancelled separately.
    const key = `${this.generation}:${url}`;
    let request = !signal ? this.pending.get(key) : undefined;
    if (!request) {
      const github = new URL(url).origin === "https://api.github.com";
      const generation = this.generation;
      const run = () => this.fetchJson(url, github, generation, signal);
      request = github ? this.queue.then(run, run) : run();
      if (github) this.queue = request.catch(() => undefined);
      if (!signal) {
        this.pending.set(key, request);
        request
          .finally(() => {
            if (this.pending.get(key) === request) this.pending.delete(key);
          })
          .catch(() => undefined);
      }
    }
    return request as Promise<T>;
  }
  private async fetchJson(
    url: string,
    github: boolean,
    generation: number,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (signal?.aborted || generation !== this.generation) throw aborted();
    if (github && this.pauseUntil > Date.now())
      throw new ApiError(
        `GitHub request limit reached. Retry after ${new Date(this.pauseUntil).toLocaleTimeString()}.`,
        "rate-limit",
        this.pauseUntil,
      );
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    this.controllers.add(controller);
    const timeout = setTimeout(cancel, 20000);
    try {
      const headers: Record<string, string> = {
        Accept: github ? "application/vnd.github+json" : "application/json",
      };
      if (github && this.token) headers.Authorization = `Bearer ${this.token}`;
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!response.ok) {
        if (github && (response.status === 403 || response.status === 429)) {
          const retry = response.headers?.get("retry-after");
          const remaining = response.headers?.get("x-ratelimit-remaining");
          let body: { message?: string } = {};
          try {
            body = await response.json();
          } catch {
            /* Status remains authoritative. */
          }
          if (
            response.status === 429 ||
            remaining === "0" ||
            retry ||
            /rate limit|abuse/i.test(body.message || "")
          ) {
            const reset =
              Number(response.headers?.get("x-ratelimit-reset")) * 1000;
            const retryAt = retry
              ? /^\d+$/.test(retry)
                ? Date.now() + Number(retry) * 1000
                : Date.parse(retry)
              : reset;
            this.pauseUntil = Math.max(
              Date.now() + 1000,
              retryAt || Date.now() + 60000,
            );
            throw new ApiError(
              `GitHub request limit reached. Retry after ${new Date(this.pauseUntil).toLocaleTimeString()}, or add a GitHub token.`,
              "rate-limit",
              this.pauseUntil,
            );
          }
          throw new ApiError(
            "GitHub denied access to this resource. Check the token permissions or use the public GitHub link.",
            "forbidden",
          );
        }
        if (response.status === 401)
          throw new ApiError(
            "GitHub rejected the token. Replace or remove it and retry.",
            "auth",
          );
        if (response.status === 404)
          throw new ApiError(
            github
              ? "This resource was not found on GitHub."
              : "This package was not found on npm.",
            "missing",
          );
        throw new ApiError(
          `The ${github ? "GitHub" : "npm"} service returned HTTP ${response.status}. Try again.`,
          "network",
        );
      }
      let value: unknown;
      try {
        value = await response.json();
      } catch {
        throw new ApiError(
          "The service returned invalid JSON. Try again.",
          "invalid",
        );
      }
      if (signal?.aborted || generation !== this.generation) throw aborted();
      const size = JSON.stringify(value).length * 2;
      this.clear(url);
      if (size <= MAX_BYTES) {
        while (this.cache.size >= 200 || this.cacheBytes + size > MAX_BYTES)
          this.clear(this.cache.keys().next().value as string);
        this.cache.set(url, { value, expires: Date.now() + TTL, size });
        this.cacheBytes += size;
      }
      return value;
    } catch (error) {
      if (signal?.aborted || generation !== this.generation) throw aborted();
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        controller.signal.aborted
          ? "The request timed out. Try again."
          : "Unable to reach the service. Check your connection and retry.",
        "network",
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", cancel);
      this.controllers.delete(controller);
    }
  }
}
