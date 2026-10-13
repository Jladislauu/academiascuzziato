import { mensagens } from '../data/config';
import { faq, respostaPendente } from '../data/faq';
import type { FaqItem } from '../data/types';
import { linkExterno, whatsappLink } from '../lib/links';
import { MOSTRAR_RASCUNHOS, SELO_RASCUNHO } from '../lib/rascunho';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconWhatsApp } from '../components/ui/icons';

export function Faq() {
  return (
    <Section id="faq" tom="gelo">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHeading
            id="faq"
            sobretitulo="Perguntas frequentes"
            titulo="Ficou alguma dúvida?"
            descricao="As respostas para o que mais perguntam antes do primeiro treino."
          />
          <Reveal className="hidden lg:block">
            <p className="mb-4 text-tom-apoio">Não achou sua pergunta?</p>
            <ButtonLink href={whatsappLink()} {...linkExterno} variante="secundario" icone={<IconWhatsApp className="size-5" />}>
              Pergunte no WhatsApp
            </ButtonLink>
          </Reveal>
        </div>

        <Reveal>
          <ul className="divide-y divide-tom-borda border-y border-tom-borda">
            {faq.map((item) => (
              <li key={item.pergunta}>
                <Pergunta item={item} />
              </li>
            ))}
          </ul>

          <div className="mt-8 lg:hidden">
            <p className="mb-4 text-tom-apoio">Não achou sua pergunta?</p>
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
          className="relative size-5 shrink-0 before:absolute before:top-1/2 before:left-0 before:h-0.5 before:w-5 before:-translate-y-1/2 before:bg-tom-destaque after:absolute after:top-0 after:left-1/2 after:h-5 after:w-0.5 after:-translate-x-1/2 after:bg-tom-destaque after:transition-transform group-open:after:scale-y-0"
        />
      </summary>

      <div className="pb-5 text-tom-apoio">
        {!pendente && <p>{item.resposta}</p>}

        {pendente && MOSTRAR_RASCUNHOS && (
          <div className="rounded-lg border-2 border-dashed border-tom-destaque p-4">
            <p className="mb-2 text-xs font-bold tracking-[0.12em] text-tom-destaque uppercase">
              {SELO_RASCUNHO}
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
              className="mt-3 inline-flex items-center gap-2 font-semibold text-tom-texto underline underline-offset-4 hover:text-tom-destaque"
            >
              <IconWhatsApp className="size-5" /> Perguntar no WhatsApp
            </a>
          </>
        )}
      </div>
    </details>
  );
}
