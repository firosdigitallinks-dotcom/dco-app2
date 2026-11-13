import { permanentRedirect } from "next/navigation";

export default function LegacyContactRoute() {
  permanentRedirect("/contact.html");
}
