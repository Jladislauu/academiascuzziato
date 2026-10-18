import { useEffect, useState } from 'react';
import { config } from '../../data/config';
import { funcionamentoTexto } from '../../lib/format';
import { instagramArroba, linkExterno, whatsappLink } from '../../lib/links';
import { Container } from '../ui/Section';
import { Logo } from '../ui/Logo';
import { NAV } from './nav';

const tituloColuna = 'mb-3 text-xs font-semibold tracking-[0.14em] text-tom-suave uppercase';
const link = 'hover:text-tom-texto underline-offset-4 hover:underline';

export function Footer() {
  const { rua, bairro, cidade, uf, cep } = config.endereco;
  // O HTML sai com o ano do build; no navegador, vira o ano atual.
  const [ano, setAno] = useState(__ANO_BUILD__);
  useEffect(() => setAno(new Date().getFullYear()), []);

  return (
    <footer className="tom-escuro border-t border-tom-borda bg-preto-profundo pt-14 pb-28 text-tom-apoio">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <a href="#topo" className="inline-block">
              <Logo className="h-14" />
            </a>
            <p className="mt-4 max-w-xs text-tom-suave">
              Centro esportivo em Pinhais. Primeira semana de treino grátis.
            </p>
          </div>

          <div>
            <h2 className={tituloColuna}>Endereço</h2>
            <address className="not-italic">
              {rua}
              <br />
              {bairro}, {cidade}-{uf}
              <br />
              {cep}
            </address>
            <p className="mt-3">{funcionamentoTexto(config.funcionamento)}</p>
          </div>

          <div>
            <h2 className={tituloColuna}>Contato</h2>
            <ul className="space-y-2">
              <li>
                <a href={whatsappLink()} {...linkExterno} className={link}>
                  WhatsApp
                </a>
              </li>
              {config.instagram && (
                <li>
                  <a href={config.instagram} {...linkExterno} className={link}>
                    Instagram {instagramArroba()}
                  </a>
                </li>
              )}
              {config.email && (
                <li>
                  <a href={`mailto:${config.email}`} className={link}>
                    {config.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <nav aria-label="Rodapé">
            <h2 className={tituloColuna}>Navegação</h2>
            <ul className="space-y-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={link}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <section id="privacidade" aria-labelledby="privacidade-titulo" className="mt-12 border-t border-tom-borda pt-8">
          <h2 id="privacidade-titulo" className={tituloColuna}>
            Privacidade
          </h2>
          <p className="max-w-3xl text-sm text-tom-suave">{config.avisoPrivacidade}</p>
        </section>

        <div className="mt-8 flex flex-col gap-2 text-sm text-tom-suave sm:flex-row sm:justify-between">
          <p>© {ano} Academia Scuzziato</p>
          <p>Site por Thryve</p>
        </div>
      </Container>
    </footer>
  );
}
