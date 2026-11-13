import { notFound, permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LegacyBlogArchivePage({
  params,
}: {
  params: Promise<{ offset: string }>;
}) {
  const { offset: rawOffset } = await params;
  const offset = Number(rawOffset);

  if (
    !/^\d+$/.test(rawOffset) ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset % 4 !== 0
  ) {
    notFound();
  }

  const page = Math.floor(offset / 12) + 1;
  permanentRedirect(page > 1 ? `/blog.html?page=${page}` : "/blog.html");
}
