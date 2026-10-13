import type { ReactNode } from 'react';
import { config } from '../data/config';
import { trackAgendamentoIniciado } from '../lib/analytics';
import { funcionamentoTexto } from '../lib/format';
import { agendaLink, comoChegarUrl, instagramArroba, linkExterno, mapaEmbedUrl, whatsappLink } from '../lib/links';
import { ButtonLink } from '../components/ui/Button';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconCalendario, IconSeta, IconWhatsApp } from '../components/ui/icons';
import { TextoGigante } from '../components/ui/efeitos';

export function Localizacao() {
  const { rua, bairro, cidade, uf, cep } = config.endereco;

  return (
    <Section
      id="contato"
      granulado
      decoracao={<TextoGigante texto="Arena" className="bottom-[-0.2em] left-1/2 -translate-x-1/2 text-[38vw] lg:text-[30rem]" />}
    >
      <SectionHeading
        id="contato"
        sobretitulo="Localização e contato"
        titulo="Vem treinar"
        descricao={`Estamos na Estância Pinhais, em ${cidade}.`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
        <Reveal>
          <dl className="space-y-6">
            <Item rotulo="Endereço">
              <address className="not-italic">
                {rua}
                <br />
                {bairro}, {cidade}-{uf}
                <br />
                {cep}
              </address>
            </Item>
            <Item rotulo="Funcionamento">{funcionamentoTexto(config.funcionamento)}</Item>
            <Item rotulo="WhatsApp">
              <a
                href={whatsappLink()}
                {...linkExterno}
                className="inline-flex items-center gap-2 font-semibold underline underline-offset-4 hover:text-tom-destaque"
              >
                <IconWhatsApp className="size-5" />
                Chamar no WhatsApp
              </a>
            </Item>
            {config.instagram && (
              <Item rotulo="Instagram">
                <a
                  href={config.instagram}
                  {...linkExterno}
                  className="font-semibold underline underline-offset-4 hover:text-tom-destaque"
                >
                  {instagramArroba()}
                </a>
              </Item>
            )}
            {config.email && (
              <Item rotulo="E-mail">
                <a
                  href={`mailto:${config.email}`}
                  className="font-semibold underline underline-offset-4 hover:text-tom-destaque"
                >
                  {config.email}
                </a>
              </Item>
            )}
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col">
            <ButtonLink
              href={agendaLink()}
              {...linkExterno}
              icone={<IconCalendario className="size-5" />}
              onClick={() => trackAgendamentoIniciado('contato')}
            >
              Agendar aula experimental
            </ButtonLink>
            <ButtonLink href={comoChegarUrl()} {...linkExterno} variante="secundario" icone={<IconSeta className="size-5" />}>
              Como chegar
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal className="overflow-hidden rounded-2xl border border-tom-borda bg-tom-card">
          <iframe
            src={mapaEmbedUrl()}
            title="Mapa com a localização da Arena Pinhais"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="aspect-4/3 h-full min-h-72 w-full border-0"
          />
        </Reveal>
      </div>
    </Section>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-tom-suave uppercase">{rotulo}</dt>
      <dd className="mt-1.5 text-lg text-tom-apoio">{children}</dd>
    </div>
  );
}
