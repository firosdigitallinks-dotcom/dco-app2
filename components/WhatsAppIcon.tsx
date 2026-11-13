import { withBasePath } from "../lib/base-path";

export function WhatsAppIcon({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <img
      className={`whatsapp-brand-icon${
        compact ? " whatsapp-brand-icon--compact" : ""
      }`}
      src={withBasePath("/icons/whatsapp.png")}
      alt="WhatsApp"
      width={compact ? 22 : 27}
      height={compact ? 22 : 27}
      aria-hidden="true"
    />
  );
}
