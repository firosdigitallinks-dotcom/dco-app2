type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();
const MAX_TRACKED_KEYS = 10_000;

function cleanupRateLimits(now: number) {
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }

  if (rateLimits.size <= MAX_TRACKED_KEYS) return;
  for (const key of rateLimits.keys()) {
    rateLimits.delete(key);
    if (rateLimits.size <= MAX_TRACKED_KEYS) break;
  }
}

export function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return (
    forwarded?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  ).slice(0, 100);
}

export function consumeRateLimit(
  namespace: string,
  request: Request,
  options: { limit: number; windowMs: number },
) {
  const now = Date.now();
  cleanupRateLimits(now);
  const key = `${namespace}:${clientAddress(request)}`;
  const previous = rateLimits.get(key);
  const entry =
    previous && previous.resetAt > now
      ? { count: previous.count + 1, resetAt: previous.resetAt }
      : { count: 1, resetAt: now + options.windowMs };

  rateLimits.set(key, entry);
  return {
    allowed: entry.count <= options.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1_000)),
  };
}

export function clearRateLimit(namespace: string, request: Request) {
  rateLimits.delete(`${namespace}:${clientAddress(request)}`);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const expectedHost = forwardedHost || request.headers.get("host") || requestUrl.host;
    return originUrl.host === expectedHost;
  } catch {
    return false;
  }
}

export function validateJsonRequest(request: Request, maxBytes: number) {
  if (!sameOrigin(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return Response.json(
      { error: "The request must use JSON." },
      { status: 415 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return Response.json(
      { error: "The request is too large." },
      { status: 413 },
    );
  }

  return null;
}
