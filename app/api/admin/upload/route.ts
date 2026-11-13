import {
  cmsErrorResponse,
  requireCmsApi,
} from "../../../../lib/admin-auth";
import { saveUploadedImage } from "../../../../lib/media-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function hasValidImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (type === "image/webp") {
    return (
      new TextDecoder("ascii").decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder("ascii").decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function POST(request: Request) {
  try {
    await requireCmsApi(request);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > 6 * 1024 * 1024) {
      return Response.json(
        { error: "The upload request is too large." },
        { status: 413 },
      );
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    const extension = allowedTypes.get(file.type);
    if (!extension) {
      return Response.json(
        { error: "Use a JPEG, PNG or WebP image." },
        { status: 415 },
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: "Images must be 5 MB or smaller." },
        { status: 413 },
      );
    }

    const content = await file.arrayBuffer();
    if (!hasValidImageSignature(file.type, new Uint8Array(content.slice(0, 16)))) {
      return Response.json(
        { error: "The uploaded file does not contain a valid image." },
        { status: 415 },
      );
    }

    const key = `${crypto.randomUUID()}.${extension}`;
    await saveUploadedImage(key, content);
    return Response.json({ ok: true, url: `/media/${key}` }, { status: 201 });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
