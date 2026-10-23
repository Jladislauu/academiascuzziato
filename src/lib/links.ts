import { config, mensagens } from '../data/config';
import type { Plano, Turma } from '../data/types';
import { agendaHref, agendaUrlCompleta } from './agenda';

/**
 * Link dos botões "Agendar": abre a janela de agendamento (src/components/agendamento),
 * já na turma se ela for informada. Fica na mesma aba (não usar linkExterno).
 */
export const agendaLink = (turma?: Turma): string => agendaHref(turma?.id);

/** Link do WhatsApp com mensagem pronta. Sem número configurado, abre o WhatsApp para escolher o contato. */
export function whatsappLink(mensagem: string = mensagens.geral): string {
  return `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

/** Convite para um amigo: abre o WhatsApp sem destinatário, com o link de agendamento. */
export function conviteAmigoLink(): string {
  return `https://wa.me/?text=${encodeURIComponent(mensagens.conviteAmigo(agendaUrlCompleta()))}`;
}

/** Link de matrícula: gateway, se houver; senão, WhatsApp com mensagem pronta. */
export function matriculaLink(plano: Plano): string {
  return config.matriculaLinks[plano.id] ?? whatsappLink(mensagens.matricula(plano.nome));
}

/** "R. Vicente D'Andréa, 617 - Estância Pinhais, Pinhais - PR, 83323-190" */
export function enderecoCompleto(): string {
  const { rua, bairro, cidade, uf, cep } = config.endereco;
  return `${rua} - ${bairro}, ${cidade} - ${uf}, ${cep}`;
}

/** Mapa para iframe, buscado pelo endereço (não precisa de chave de API). */
export function mapaEmbedUrl(): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(enderecoCompleto())}&output=embed`;
}

/** Abre a rota no Google Maps (no celular, abre o app). */
export function comoChegarUrl(): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoCompleto())}`;
}

/** "https://www.instagram.com/academiascuzziato" → "@academiascuzziato" */
export function instagramArroba(): string {
  const usuario = config.instagram.replace(/\/+$/, '').split('/').pop();
  return usuario ? `@${usuario}` : '';
}

export const linkExterno ={ target: '_blank', rel: 'noopener noreferrer' } as const;
