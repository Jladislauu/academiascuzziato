import { mensagens } from '../data/config';
import { faq, respostaPendente } from '../data/faq';
import type { FaqItem } from '../data/types';
import { linkExterno, whatsappLink } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconWhatsApp } from '../components/ui/icons';

// Rascunhos (confirmado: false) só aparecem no `npm run dev`. No build, nunca.
const MOSTRAR_RASCUNHOS = import.meta.env.DEV;

export function Faq() {
  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeading
            id="faq"
            sobretitulo="Perguntas frequentes"
            titulo="Ficou alguma dúvida?"
            descricao="As respostas para o que mais perguntam antes do primeiro treino."
          />
          <Reveal className="hidden lg:block">
            <p className="mb-4 text-cinza-200">Não achou sua pergunta?</p>
            <ButtonLink href={whatsappLink()} {...linkExterno} variante="secundario" icone={<IconWhatsApp className="size-5" />}>
              Pergunte no WhatsApp
            </ButtonLink>
          </Reveal>
        </div>

        <Reveal>
          <ul className="divide-y divide-cinza-700 border-y border-cinza-700">
            {faq.map((item) => (
              <li key={item.pergunta}>
                <Pergunta item={item} />
              </li>
            ))}
          </ul>

          <div className="mt-8 lg:hidden">
            <p className="mb-4 text-cinza-200">Não achou sua pergunta?</p>
            <ButtonLink href={whatsappLink()} {...linkExterno} variante="secundario" icone={<IconWhatsApp className="size-5" />}>
              Pergunte no WhatsApp
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Pergunta({ item }: { item: FaqItem }) {
  const pendente = !item.confirmado;

  return (
    <details className="group">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-lg font-semibold [&::-webkit-details-marker]:hidden">
        {item.pergunta}
        <span
          aria-hidden="true"
          className="relative size-5 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-0.5 before:w-5 before:-translate-y-1/2 before:bg-vermelho-claro after:absolute after:top-0 after:left-1/2 after:h-5 after:w-0.5 after:-translate-x-1/2 after:bg-vermelho-claro after:transition-transform group-open:after:scale-y-0"
        />
      </summary>

      <div className="pb-5 text-cinza-200">
        {!pendente && <p>{item.resposta}</p>}

        {pendente && MOSTRAR_RASCUNHOS && (
          <div className="rounded-lg border-2 border-dashed border-vermelho-claro p-4">
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-vermelho-claro uppercase">
              Rascunho — confirmar com o Rhaue (não aparece no site publicado)
            </p>
            <p>{item.resposta}</p>
          </div>
        )}

        {pendente && !MOSTRAR_RASCUNHOS && (
          <>
            <p>{respostaPendente}</p>
            <a
              href={whatsappLink(mensagens.duvidaFaq(item.pergunta))}
              {...linkExterno}
              className="mt-3 inline-flex items-center gap-2 font-semibold text-branco underline underline-offset-4 hover:text-vermelho-claro"
            >
              <IconWhatsApp className="size-5" /> Perguntar no WhatsApp
            </a>
          </>
        )}
      </div>
    </details>
  );
}
