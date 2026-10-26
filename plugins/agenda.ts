import type { Plugin, ResolvedConfig } from 'vite';
import { agenda } from '../src/data/agenda';
import { config } from '../src/data/config';
import { nomeModalidade } from '../src/data/modalidades';
import { turmas } from '../src/data/turmas';
import { professorDoDia, turmasAgendaveis } from '../src/lib/aulas';

/*
 * Gera dist/api/turmas.json a partir de src/data (turmas.ts, agenda.ts e config.ts).
 *
 * É o que o api/agendamento.php e o painel usam para saber quais turmas aceitam
 * agendamento, em que dias e horários, e quantas vagas tem cada aula. Assim a
 * grade continua sendo editada só em src/data: mudou lá, o próximo build atualiza o PHP.
 *
 * O arquivo não é acessível pelo navegador (bloqueado no .htaccess); o PHP lê do disco.
 */
export function agendaPlugin(): Plugin {
  let viteConfig: ResolvedConfig;

  return {
    name: 'academia-agenda',
    apply: 'build',
    configResolved(resolvido) {
      viteConfig = resolvido;
    },
    generateBundle() {
      if (viteConfig.build.ssr) return; // build de pré-renderização

      const dados = {
        aviso: 'Gerado no build a partir de src/data. Não edite aqui.',
        vagasPorAula: config.vagasPorAula,
        diasAFrente: agenda.diasAFrente,
        antecedenciaMinutos: agenda.antecedenciaMinutos,
        diasSemanaGratis: agenda.diasSemanaGratis,
        diasSemAula: agenda.diasSemAula,
        turmas: turmasAgendaveis(turmas).map((t) => ({
          id: t.id,
          nome: t.nome,
          modalidade: nomeModalidade(t.modalidade),
          infantil: t.publico === 'infantil',
          dias: t.dias,
          // Professor de cada dia; null = a confirmar (o dia não abre para agendamento).
          professores: Object.fromEntries(t.dias.map((d) => [d, professorDoDia(t, d)])),
          inicio: t.inicio,
          fim: t.fim,
        })),
      };

      this.emitFile({ type: 'asset', fileName: 'api/turmas.json', source: `${JSON.stringify(dados, null, 2)}\n` });
    },
  };
}
