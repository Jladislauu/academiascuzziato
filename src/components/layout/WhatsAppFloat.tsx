import { linkExterno, whatsappLink } from '../../lib/links';
import { IconWhatsApp } from '../ui/icons';

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappLink()}
      {...linkExterno}
      aria-label="Falar com a Arena Pinhais no WhatsApp"
      className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-preto shadow-lg shadow-preto/60 transition-transform duration-150 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
    >
      <IconWhatsApp className="size-7" />
    </a>
  );
}
