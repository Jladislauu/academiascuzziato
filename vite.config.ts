import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { prerenderPlugin } from './plugins/prerender';
import { seoPlugin } from './plugins/seo';

export default defineConfig({
  plugins: [react(), tailwindcss(), seoPlugin(), prerenderPlugin()],
  define: {
    // Ano do rodapé no HTML pré-renderizado (o navegador atualiza depois).
    __ANO_BUILD__: JSON.stringify(new Date().getFullYear()),
  },
});
