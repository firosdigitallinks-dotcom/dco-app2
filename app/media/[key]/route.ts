import { readUploadedImage } from "../../../lib/media-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(key)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const object = await readUploadedImage(key);
    return new Response(object.body, {
      headers: {
        "content-type": object.contentType,
        "content-length": String(object.body.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
        "content-disposition": "inline",
        "content-security-policy": "default-src 'none'; sandbox",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return new Response(code === "ENOENT" ? "Not found" : "Media unavailable", {
      status: code === "ENOENT" ? 404 : 503,
    });
  }
}
