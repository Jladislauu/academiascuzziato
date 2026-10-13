declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Evento de conversão "agendamento iniciado". Disparado no clique de todo botão
 * que abre a agenda. Quando o Google Analytics (gtag) ou o Tag Manager
 * (dataLayer) estiverem instalados no index.html, o evento passa a ser enviado
 * sem mudar nada aqui.
 *
 * @param origem de onde veio o clique (ex.: 'topo', 'grade:jiu-jitsu-gi')
 */
export function trackAgendamentoIniciado(origem: string): void {
  const params = { origem };

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'agendamento_iniciado', params);
  } else if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: 'agendamento_iniciado', ...params });
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics] agendamento_iniciado', params);
  }
}
