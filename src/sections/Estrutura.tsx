import { fotosEstrutura } from '../data/estrutura';
import type { FotoEstrutura } from '../data/types';
import { Reveal } from '../components/ui/Reveal';
import { Section, SectionHeading } from '../components/ui/Section';

export function Estrutura() {
  return (
    <Section id="estrutura">
      <SectionHeading
        id="estrutura"
        sobretitulo="Estrutura"
        titulo="Conheça a academia"
        descricao="Um espaço feito para treinar, na Estância Pinhais."
      />

      <Reveal>
        <ul className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[12rem] md:grid-cols-3">
          {fotosEstrutura.map((item, i) => (
            <li
              key={item.foto?.src ?? i}
              className={i === 0 ? 'md:col-span-2 md:row-span-2' : ''}
            >
              <ItemGaleria item={item} />
            </li>
          ))}
        </ul>
      </Reveal>
    </Section>
  );
}

function ItemGaleria({ item }: { item: FotoEstrutura }) {
  if (!item.foto) {
    // Placeholder até chegarem as fotos.
    return (
      <div className="relative flex h-full items-center justify-center overflow-hidden rounded-xl border border-tom-borda bg-tom-card">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0_18px,var(--tom-linha)_18px_19px)]"
        />
        <span className="relative text-sm font-semibold tracking-[0.12em] text-tom-suave uppercase">Foto em breve</span>
      </div>
    );
  }

  return (
    <figure className="relative h-full overflow-hidden rounded-xl">
      <img
        src={item.foto.src}
        alt={item.foto.alt}
        width={item.foto.largura}
        height={item.foto.altura}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      {item.legenda && (
        <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-preto/90 to-transparent p-3 pt-8 text-sm font-semibold">
          {item.legenda}
        </figcaption>
      )}
    </figure>
  );
}
