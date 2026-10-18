import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, type Plugin, type ResolvedConfig } from 'vite';

/*
 * Pré-renderização: depois do build normal, gera o HTML completo da página
 * (src/entry-server.tsx) e coloca dentro do <div id="root"> do dist/index.html.
 * Assim o conteúdo aparece para o Google e para robôs que não executam
 * JavaScript; no navegador, o main.tsx "hidrata" esse HTML.
 *
 * Continua sendo só `npm run build`.
 */

const MARCADOR = '<div id="root"></div>';
const ENTRADA = 'src/entry-server.tsx';

export function prerenderPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: 'academia-prerender',
    apply: 'build',
    configResolved(resolvido) {
      config = resolvido;
    },
    async closeBundle() {
      // O build de servidor abaixo também carrega este plugin: ali não faz nada.
      if (config.build.ssr) return;

      const pastaSite = path.resolve(config.root, config.build.outDir);
      const pastaServidor = path.resolve(config.root, 'node_modules/.cache/academia-prerender');

      await build({
        root: config.root,
        mode: config.mode,
        logLevel: 'warn',
        build: {
          ssr: ENTRADA,
          outDir: pastaServidor,
          emptyOutDir: true,
          copyPublicDir: false,
        },
      });

      try {
        const arquivo = fs.readdirSync(pastaServidor).find((f) => /^entry-server\.m?js$/.test(f));
        if (!arquivo) throw new Error(`prerender: ${ENTRADA} não gerou saída em ${pastaServidor}`);

        const { render } = (await import(
          `${pathToFileURL(path.join(pastaServidor, arquivo)).href}?t=${Date.now()}`
        )) as { render: () => string };

        const caminhoHtml = path.join(pastaSite, 'index.html');
        const html = fs.readFileSync(caminhoHtml, 'utf8');
        if (!html.includes(MARCADOR)) throw new Error(`prerender: index.html sem ${MARCADOR}`);

        fs.writeFileSync(caminhoHtml, html.replace(MARCADOR, `<div id="root">${render()}</div>`));
        config.logger.info(`prerender: HTML da página gerado em ${path.relative(config.root, caminhoHtml)}`);
      } finally {
        fs.rmSync(pastaServidor, { recursive: true, force: true });
      }
    },
  };
}
