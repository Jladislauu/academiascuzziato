import { useEffect, useState } from 'react';
import { agendaLink, linkExterno } from '../../lib/links';
import { trackAgendamentoIniciado } from '../../lib/analytics';
import { ButtonLink } from '../ui/Button';
import { Container } from '../ui/Section';
import { IconFechar, IconMenu } from '../ui/icons';
import { Logo } from '../ui/Logo';

// Seções no menu. Acrescentar aqui conforme forem sendo construídas.
const NAV = [
  { href: '#horarios', label: 'Horários' },
  { href: '#planos', label: 'Planos' },
];

export function Header() {
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 8);
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

  const fundo = rolou || aberto ? 'border-cinza-700 bg-preto/95 backdrop-blur' : 'border-transparent';

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${fundo}`}>
      <Container className="flex h-16 items-center gap-4">
        <a href="#topo" className="shrink-0" onClick={() => setAberto(false)}>
          <Logo className="h-9" />
        </a>

        <nav aria-label="Principal" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-8">
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
          className="ml-auto md:ml-0"
          aria-label="Agendar aula experimental grátis"
        >
          <span>
            Agendar<span className="hidden lg:inline"> aula grátis</span>
          </span>
        </ButtonLink>

        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center rounded-lg text-branco md:hidden"
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
        className="border-t border-cinza-700 md:hidden"
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
