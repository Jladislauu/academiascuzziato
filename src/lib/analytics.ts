declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Envia um evento para o Google Analytics (gtag) ou o Tag Manager (dataLayer),
 * se estiverem instalados no index.html. Sem eles, não faz nada.
 */
function enviarEvento(nome: string, params: Record<string, string>): void {
  if (typeof window.gtag === 'function') {
    window.gtag('event', nome, params);
  } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: nome, ...params });
  }

  if (import.meta.env.DEV) {
    console.debug(`[analytics] ${nome}`, params);
  }
}

/**
 * Conversão "agendamento iniciado": clique em qualquer botão que abre a agenda.
 *
 * @param origem de onde veio o clique (ex.: 'topo', 'grade:jiu-jitsu-gi')
 */
export function trackAgendamentoIniciado(origem: string): void {
  enviarEvento('agendamento_iniciado', { origem });
}

/** Envio do formulário "Turmas em formação". */
export function trackInteresseEnviado(modalidade: string): void {
  enviarEvento('interesse_enviado', { modalidade });
}
