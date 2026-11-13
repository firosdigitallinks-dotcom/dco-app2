import { permanentRedirect } from "next/navigation";

export default function LegacyFaqRoute() {
  permanentRedirect("/faq.html");
}
