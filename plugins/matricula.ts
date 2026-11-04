import type { Plugin, ResolvedConfig } from 'vite';
import { matricula } from '../src/data/matricula';
import { modalidades } from '../src/data/modalidades';
import { planos } from '../src/data/planos';
import { turmas } from '../src/data/turmas';

/*
 * Gera dist/api/matricula.json a partir de src/data (planos.ts, turmas.ts,
 * modalidades.ts e matricula.ts).
 *
 * É o que o api/matricula.php usa para validar o plano escolhido, a modalidade,
 * as turmas pretendidas e a versão do termo de adesão aceita. Assim a matrícula
 * continua sendo editada só em src/data: mudou lá, o próximo build atualiza o PHP.
 *
 * O arquivo não é acessível pelo navegador (bloqueado no .htaccess); o PHP lê do disco.
 */
export function matriculaPlugin(): Plugin {
  let viteConfig: ResolvedConfig;

  return {
    name: 'academia-matricula',
    apply: 'build',
    configResolved(resolvido) {
      viteConfig = resolvido;
    },
    generateBundle() {
      if (viteConfig.build.ssr) return; // build de pré-renderização

      // Modalidade matriculável: tem pelo menos uma turma com horário confirmado (não provisória).
      // Mais confiável do que o campo emFormacao de modalidades.ts, que pode ficar desatualizado.
      const comTurma = new Set(turmas.filter((t) => !t.provisorio).map((t) => t.modalidade));

      const dados = {
        aviso: 'Gerado no build a partir de src/data. Não edite aqui.',
        taxaAdesao: matricula.taxaAdesao,
        termoVersao: matricula.termoAdesao.versao,
        modalidades: modalidades.filter((m) => comTurma.has(m.id)).map((m) => m.id),
        planos: planos.map((p) => ({ id: p.id, nome: p.nome, precoMensal: p.precoMensal })),
        turmas: turmas.map((t) => ({ id: t.id, nome: t.nome, modalidade: t.modalidade })),
      };

      this.emitFile({ type: 'asset', fileName: 'api/matricula.json', source: `${JSON.stringify(dados, null, 2)}\n` });
    },
  };
}
