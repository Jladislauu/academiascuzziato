import fs from 'node:fs';
import path from 'node:path';
import type { Plugin, ResolvedConfig } from 'vite';
import { config } from '../src/data/config';
import { planos } from '../src/data/planos';
import { seo } from '../src/data/seo';
import type { DiaSemana } from '../src/data/types';

/*
 * SEO gerado a partir de src/data, para ficar no HTML estático (é o que o Google
 * e o WhatsApp leem):
 *   - <title>, description, canonical, Open Graph e Twitter no lugar de <!-- seo --> do index.html
 *   - dados estruturados schema.org (SportsActivityLocation)
 *   - robots.txt e sitemap.xml no dist/
 *
 * Homologação (branch dev, ver .github/workflows/deploy.yml): o workflow define
 * VITE_SITE_URL e VITE_HOMOLOGACAO=true. Aí o site usa a URL de homologação e não
 * pode ser indexado: meta robots noindex, robots.txt com Disallow: / (sem sitemap)
 * e cabeçalho X-Robots-Tag no .htaccess. Sem essas variáveis (produção), nada muda.
 */

const HOMOLOGACAO = process.env.VITE_HOMOLOGACAO === 'true';
const SITE_URL = process.env.VITE_SITE_URL || config.siteUrl;

const DIA_SCHEMA: Record<DiaSemana, string> = {
  seg: 'Monday',
  ter: 'Tuesday',
  qua: 'Wednesday',
  qui: 'Thursday',
  sex: 'Friday',
  sab: 'Saturday',
  dom: 'Sunday',
};

const url = (caminho = '/') => new URL(caminho, SITE_URL).toString();

const attr = (valor: string) =>
  valor.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function dadosEstruturados() {
  const { endereco, funcionamento } = config;
  const precos = planos.map((p) => p.precoMensal);

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    '@id': url('/#academia'),
    name: 'Academia Scuzziato',
    description: seo.descricao,
    url: url(),
    logo: url('/brand/academia-scuzziato-avatar.png'),
    image: url(seo.compartilhamento.imagem),
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${endereco.rua} - ${endereco.bairro}`,
      addressLocality: endereco.cidade,
      addressRegion: endereco.uf,
      postalCode: endereco.cep,
      addressCountry: 'BR',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: funcionamento.dias.map((d) => `https://schema.org/${DIA_SCHEMA[d]}`),
        opens: funcionamento.abre,
        closes: funcionamento.fecha,
      },
    ],
    priceRange: `R$ ${Math.min(...precos)}–${Math.max(...precos)}`,
    // Só entram quando forem preenchidos em config.ts.
    ...(config.whatsapp && { telephone: `+${config.whatsapp}` }),
    ...(config.email && { email: config.email }),
    ...(config.instagram && { sameAs: [config.instagram] }),
  };
}

function tagsHead(): string {
  const og = seo.compartilhamento;
  const jsonLd = JSON.stringify(dadosEstruturados(), null, 2).replace(/</g, '\\u003c');

  return [
    ...(HOMOLOGACAO ? ['<meta name="robots" content="noindex, nofollow" />'] : []),
    `<title>${attr(seo.titulo)}</title>`,
    `<meta name="description" content="${attr(seo.descricao)}" />`,
    `<link rel="canonical" href="${url()}" />`,
    '',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="Academia Scuzziato" />`,
    `<meta property="og:url" content="${url()}" />`,
    `<meta property="og:title" content="${attr(og.titulo)}" />`,
    `<meta property="og:description" content="${attr(og.descricao)}" />`,
    `<meta property="og:image" content="${url(og.imagem)}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${attr(og.imagemAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${attr(og.titulo)}" />`,
    `<meta name="twitter:description" content="${attr(og.descricao)}" />`,
    `<meta name="twitter:image" content="${url(og.imagem)}" />`,
    `<meta name="twitter:image:alt" content="${attr(og.imagemAlt)}" />`,
    '',
    `<script type="application/ld+json">\n${jsonLd}\n</script>`,
  ]
    .map((linha) => (linha ? `    ${linha}` : ''))
    .join('\n');
}

const robots = () =>
  HOMOLOGACAO
    ? `User-agent: *
Disallow: /
`
    : `User-agent: *
Allow: /
Disallow: /api/
Disallow: /painel/

Sitemap: ${url('/sitemap.xml')}
`;

const sitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url()}</loc>
    <lastmod>${new Date().toLocaleDateString('sv-SE')}</lastmod>
  </url>
</urlset>
`;

const NOINDEX_HTACCESS = `
# Homologação: não indexar (acrescentado no build com VITE_HOMOLOGACAO=true)
<IfModule mod_headers.c>
  Header always set X-Robots-Tag "noindex, nofollow"
</IfModule>
`;

export function seoPlugin(): Plugin {
  let viteConfig: ResolvedConfig;

  return {
    name: 'academia-seo',
    configResolved(resolvido) {
      viteConfig = resolvido;
    },
    transformIndexHtml(html, ctx) {
      if (!html.includes('<!-- seo -->')) throw new Error('index.html sem o marcador <!-- seo -->');
      let head = tagsHead();

      // Pré-carrega a fonte do título do topo (maior elemento da primeira tela).
      const fonteTitulo = Object.keys(ctx.bundle ?? {}).find((f) =>
        /barlow-condensed-latin-900-normal-[\w-]+\.woff2$/.test(f),
      );
      if (fonteTitulo) {
        head = `    <link rel="preload" href="/${fonteTitulo}" as="font" type="font/woff2" crossorigin />\n${head}`;
      }

      return html.replace('    <!-- seo -->', head);
    },
    generateBundle() {
      if (viteConfig.build.ssr) return; // build de pré-renderização não gera robots/sitemap
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() });
      if (!HOMOLOGACAO) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });
    },
    closeBundle() {
      if (!HOMOLOGACAO || viteConfig.build.ssr) return;
      const htaccess = path.resolve(viteConfig.root, viteConfig.build.outDir, '.htaccess');
      if (!fs.existsSync(htaccess)) throw new Error('seo: dist/.htaccess não encontrado (deveria vir de public/)');
      fs.appendFileSync(htaccess, NOINDEX_HTACCESS);
    },
  };
}
