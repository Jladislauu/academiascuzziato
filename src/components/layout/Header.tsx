import { useEffect, useState } from 'react';
import { agendaLink, linkExterno } from '../../lib/links';
import { trackAgendamentoIniciado } from '../../lib/analytics';
import { ButtonLink } from '../ui/Button';
import { Container } from '../ui/Section';
import { IconFechar, IconMenu } from '../ui/icons';
import { Logo } from '../ui/Logo';
import { NAV } from './nav';

// O topo já mostra o logo grande; o do cabeçalho só aparece depois de rolar.
const ROLAGEM_LOGO = 220;

export function Header() {
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const [logoVisivel, setLogoVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setRolou(window.scrollY > 8);
      setLogoVisivel(window.scrollY > ROLAGEM_LOGO);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto]);

  const mostrarLogo = logoVisivel || aberto;
  const fundo = rolou || aberto ? 'border-cinza-700 bg-preto/95 backdrop-blur' : 'border-transparent';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${fundo}`}>
      <Container className="flex h-16 items-center gap-4">
        <a
          href="#topo"
          onClick={() => setAberto(false)}
          aria-hidden={!mostrarLogo}
          tabIndex={mostrarLogo ? undefined : -1}
          className={`shrink-0 transition-opacity duration-200 ${mostrarLogo ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
          <Logo className="h-10 lg:h-11" />
        </a>

        <nav aria-label="Principal" className="ml-auto hidden lg:block">
          <ul className="flex items-center gap-6 xl:gap-8">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="font-semibold text-cinza-200 transition-colors hover:text-branco"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ButtonLink
          href={agendaLink()}
          {...linkExterno}
          onClick={() => trackAgendamentoIniciado('cabecalho')}
          className="ml-auto lg:ml-0"
          aria-label="Agendar aula experimental grátis"
        >
          <span>
            Agendar<span className="hidden xl:inline"> aula grátis</span>
          </span>
        </ButtonLink>

        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-branco lg:hidden"
          aria-expanded={aberto}
          aria-controls="menu-mobile"
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <IconFechar className="size-6" /> : <IconMenu className="size-6" />}
        </button>
      </Container>

      <nav
        id="menu-mobile"
        aria-label="Principal"
        hidden={!aberto}
        className="border-t border-cinza-700 lg:hidden"
      >
        <Container>
          <ul className="py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setAberto(false)}
                  className="block py-3 font-display text-2xl font-extrabold uppercase"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </header>
  );
}
