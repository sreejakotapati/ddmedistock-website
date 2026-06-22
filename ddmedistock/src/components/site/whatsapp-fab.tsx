import { whatsappLink, WHATSAPP } from "@/lib/site";
import { WhatsappIcon } from "./whatsapp-icon";

/**
 * Floating WhatsApp action button, fixed on every marketing page. Plain anchor
 * so it works without JS; the pre-filled message comes from WHATSAPP.defaultMessage.
 */
export function WhatsappFab() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${WHATSAPP.display} on WhatsApp`}
      className="wa-fab group fixed bottom-5 right-5 z-50 flex items-center gap-0 rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:gap-2 hover:pl-4 hover:pr-5"
    >
      <span className="relative grid h-14 w-14 place-items-center">
        {/* soft pulse ring */}
        <span className="wa-pulse absolute inset-0 rounded-full bg-[#25D366]" aria-hidden="true" />
        <WhatsappIcon size={30} className="relative" />
      </span>
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[10rem] group-hover:opacity-100">
        Chat on WhatsApp
      </span>
    </a>
  );
}
