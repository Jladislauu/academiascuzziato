import { modalidades } from '../data/modalidades';
import type { ModalidadeInfo } from '../data/types';
import { escolherModalidadeInteresse } from '../lib/interesse';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';
import { IconSeta } from '../components/ui/icons';
import { LinhasQuadra } from '../components/ui/efeitos';

export function Modalidades() {
  return (
    <Section id="modalidades" decoracao={<LinhasQuadra className="opacity-70" />}>
      <SectionHeading
        id="modalidades"
        sobretitulo="Modalidades"
        titulo="Escolha sua luta"
        descricao="Começamos pelas artes marciais, com turmas para crianças e adultos, do primeiro treino à competição."
      />

      <ul className="grid gap-4 sm:grid-cols-2">
        {modalidades.map((modalidade, i) => (
          <Reveal as="li" key={modalidade.id} atraso={(i % 2) * 0.08} className="flex">
            <ModalidadeCard modalidade={modalidade} />
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

function ModalidadeCard({ modalidade }: { modalidade: ModalidadeInfo }) {
  const { emFormacao } = modalidade;

  return (
    <article
      className={`flex w-full flex-col overflow-hidden rounded-2xl ${
        emFormacao ? 'border-2 border-dashed border-tom-borda' : 'border border-tom-borda bg-tom-card'
      }`}
    >
      {modalidade.foto && (
        <div className="relative aspect-3/2 overflow-hidden bg-tom-chip">
          <img
            src={modalidade.foto.src}
            alt={modalidade.foto.alt}
            width={modalidade.foto.largura}
            height={modalidade.foto.altura}
            loading="lazy"
            decoding="async"
            // Turma em formação: foto apagada, como a borda tracejada do card.
            className={`size-full object-cover ${emFormacao ? 'opacity-70 grayscale' : ''}`}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t to-transparent ${
              emFormacao ? 'from-tom-fundo' : 'from-tom-card'
            }`}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <hgroup>
            <h3 className="font-display text-5xl leading-none font-black uppercase md:text-6xl">{modalidade.nome}</h3>
            <p className="mt-2 font-display text-lg font-extrabold tracking-[0.08em] text-tom-destaque uppercase">
              {modalidade.equipe}
            </p>
          </hgroup>
          {emFormacao && (
            <span className="rounded-md border border-tom-borda-forte px-2.5 py-1 text-sm font-semibold tracking-[0.12em] text-tom-apoio uppercase">
              Em formação
            </span>
          )}
        </div>

        <p className="mt-3 text-tom-apoio">{modalidade.descricao}</p>

        <dl className="mt-6 grid gap-4 border-t border-tom-borda pt-5 sm:grid-cols-2">
          <Info rotulo="Público" itens={modalidade.publicos} />
          {modalidade.niveis.length > 0 && <Info rotulo="Níveis" itens={modalidade.niveis} />}
        </dl>

        <div className="mt-auto pt-6">
          {emFormacao ? (
            <a
              href={`?modalidade=${modalidade.id}#em-formacao`}
              onClick={(e) => {
                // Sem recarregar a página: marca a modalidade no formulário e rola até ele.
                e.preventDefault();
                escolherModalidadeInteresse(modalidade.id);
                history.replaceState(null, '', `?modalidade=${modalidade.id}#em-formacao`);
                document.getElementById('em-formacao')?.scrollIntoView();
              }}
              className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-tom-texto uppercase hover:text-tom-destaque"
            >
              Quero ser avisado <IconSeta className="size-5" />
            </a>
          ) : (
            <a
              href="#horarios"
              className="inline-flex items-center gap-2 font-display text-xl font-extrabold text-tom-destaque uppercase hover:text-tom-texto"
            >
              Ver horários <IconSeta className="size-5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function Info({ rotulo, itens }: { rotulo: string; itens: string[] }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.14em] text-tom-suave uppercase">{rotulo}</dt>
      <dd className="mt-2 flex flex-wrap gap-1.5">
        {itens.map((item) => (
          <span key={item} className="rounded-md bg-tom-chip px-2.5 py-1 text-sm font-medium text-tom-apoio">
            {item}
          </span>
        ))}
      </dd>
    </div>
  );
}
