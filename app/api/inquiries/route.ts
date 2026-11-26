import { databaseTimestamp, getDb } from "../../../db";
import { ensureSeedData } from "../../../db/site";
import { inquiries } from "../../../db/schema";
import { sendEnquiryEmails } from "../../../lib/enquiry-email";
import {
  consumeRateLimit,
  validateJsonRequest,
} from "../../../lib/request-security";

export const dynamic = "force-dynamic";

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const invalidRequest = validateJsonRequest(request, 16 * 1024);
    if (invalidRequest) return invalidRequest;

    const rateLimit = consumeRateLimit("public-inquiry", request, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimit.allowed) {
      return Response.json(
        { error: "Too many enquiries. Please wait before trying again." },
        {
          status: 429,
          headers: { "retry-after": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (text(body.website, 200)) {
      return Response.json({ ok: true }, { status: 201 });
    }

    const name = text(body.name, 120);
    const email = text(body.email, 180).toLowerCase();
    const location = text(body.location, 100);
    let message = text(body.message, 3000);
    if (location && !message.includes(`Location: ${location}`)) {
      message = `[Location: ${location}]\n${message}`;
    }
    const company = text(body.company, 180);
    const phone = text(body.phone, 80);
    const productName = text(body.productName, 180) || "General enquiry";
    const sku = text(body.sku, 100);
    const market = ["UAE", "Oman", "Qatar"].includes(text(body.market, 20))
      ? text(body.market, 20)
      : "UAE";
    const requestedPageUrl = text(body.pageUrl, 500);
    const pageUrl = /^https?:\/\//i.test(requestedPageUrl)
      ? requestedPageUrl
      : "";
    if (
      !name ||
      !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) ||
      message.length < 10
    ) {
      return Response.json(
        { error: "Add your name, a valid email and a short message." },
        { status: 400 },
      );
    }

    await ensureSeedData();
    await getDb().insert(inquiries).values({
      id: crypto.randomUUID(),
      productId: text(body.productId, 100) || null,
      productName,
      name,
      company,
      email,
      phone,
      message,
      market,
      channel: "website",
      status: "new",
      createdAt: databaseTimestamp(),
    });

    await sendEnquiryEmails({
      name,
      company,
      email,
      phone,
      market,
      message,
      productName,
      sku,
      pageUrl,
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to process website enquiry:", error);
    return Response.json(
      { error: "Unable to send the enquiry. Please try again or call our team." },
      { status: 500 },
    );
  }
}
