import { NextResponse } from "next/server";
import {
  clearCmsSession,
  createCmsSession,
  verifyCmsCredentials,
} from "../../../../lib/admin-auth";
import {
  clearRateLimit,
  consumeRateLimit,
  sameOrigin,
  validateJsonRequest,
} from "../../../../lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const invalidRequest = validateJsonRequest(request, 16 * 1024);
  if (invalidRequest) return invalidRequest;

  const rateLimit = consumeRateLimit("cms-login", request, {
    limit: MAX_ATTEMPTS,
    windowMs: WINDOW_MS,
  });
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many sign-in attempts. Try again in 15 minutes." },
      {
        status: 429,
        headers: { "retry-after": String(rateLimit.retryAfterSeconds) },
      },
    );
  }
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!verifyCmsCredentials(body.email || "", body.password || "")) {
      return Response.json({ error: "Incorrect email or password." }, { status: 401 });
    }
    clearRateLimit("cms-login", request);
    await createCmsSession(body.email || "");
    return Response.json({ ok: true });
  } catch (error) {
    console.error("CMS sign-in failed:", error);
    return Response.json(
      { error: "Unable to sign in. Check the server configuration and try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }
  await clearCmsSession();
  return Response.json({ ok: true });
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/admin/login", request.url));
}
