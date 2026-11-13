import { permanentRedirect } from "next/navigation";

export default function LegacyBlogRoute() {
  permanentRedirect("/blog.html");
}
