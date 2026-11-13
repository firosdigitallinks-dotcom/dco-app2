import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "hl_cms_session";
const SESSION_SECONDS = 8 * 60 * 60;

export class CmsAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "CmsAuthError";
    this.status = status;
  }
}

function sessionSecret() {
  const configured = process.env.CMS_SESSION_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "local-development-session-secret";
  throw new Error("CMS_SESSION_SECRET is missing from the cPanel environment.");
}

function configuredEmail() {
  const email = process.env.CMS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("CMS_ADMIN_EMAIL is missing from the cPanel environment.");
  return email;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parsePasswordHash(value: string) {
  // CloudLinux's activation shell may interpret unescaped dollar signs, while
  // Passenger can receive the backslash-escaped form literally. Accept both
  // legacy representations, plus the shell-safe colon format used by the
  // current password generator.
  const normalized = value.trim().replace(/\\\$/g, "$");
  const parts = normalized.includes("$")
    ? normalized.split("$")
    : normalized.split(":");
  const [algorithm, salt, expectedHex] = parts;
  if (
    parts.length !== 3 ||
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/i.test(salt || "") ||
    !/^[a-f0-9]{128}$/i.test(expectedHex || "")
  ) {
    throw new Error("CMS_ADMIN_PASSWORD_HASH is not in the required scrypt format.");
  }
  return { salt, expectedHex };
}

function decodeSession(token?: string) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(sign(payload), signature)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string;
      exp?: number;
    };
    if (!value.email || !value.exp || value.exp <= Date.now()) return null;
    if (value.email.toLowerCase() !== configuredEmail()) return null;
    return {
      displayName: "Hygiene Links administrator",
      fullName: "Hygiene Links administrator",
      email: value.email,
    };
  } catch {
    return null;
  }
}

function cookieFromRequest(request: Request) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

export function verifyCmsCredentials(email: string, password: string) {
  const expectedEmail = configuredEmail();
  const encoded = process.env.CMS_ADMIN_PASSWORD_HASH?.trim();
  if (!encoded) throw new Error("CMS_ADMIN_PASSWORD_HASH is missing from the cPanel environment.");
  const { salt, expectedHex } = parsePasswordHash(encoded);
  const actualHex = scryptSync(password, salt, 64).toString("hex");
  return safeEqual(email.trim().toLowerCase(), expectedEmail) && safeEqual(actualHex, expectedHex);
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function createCmsSession(email: string) {
  const payload = Buffer.from(
    JSON.stringify({ email: email.toLowerCase(), exp: Date.now() + SESSION_SECONDS * 1000 }),
  ).toString("base64url");
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearCmsSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function requireCmsPage() {
  const store = await cookies();
  const user = decodeSession(store.get(COOKIE_NAME)?.value);
  if (!user) redirect("/admin/login");
  return user;
}

export async function requireCmsApi(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    throw new CmsAuthError("Cross-origin CMS requests are not allowed.", 403);
  }
  const user = decodeSession(cookieFromRequest(request));
  if (!user) throw new CmsAuthError("Sign in is required.", 401);
  return user;
}

export function cmsErrorResponse(error: unknown) {
  if (error instanceof CmsAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("CMS request failed", error);
  return Response.json(
    {
      error:
        process.env.NODE_ENV === "production"
          ? "The CMS request could not be completed."
          : error instanceof Error
            ? error.message
            : "Unexpected CMS error",
    },
    { status: 500 },
  );
}
