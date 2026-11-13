import { permanentRedirect } from "next/navigation";

export default function LegacyCatalogRoute() {
  permanentRedirect("/catalog.html");
}
