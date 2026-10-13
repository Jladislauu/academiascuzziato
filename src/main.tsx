import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow-condensed/900.css';
import './index.css';
import App from './App';

const raiz = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// No site publicado o HTML já vem pré-renderizado: o React só assume a página.
// No `npm run dev` o #root vem vazio e o React renderiza do zero.
if (raiz.hasChildNodes()) {
  hydrateRoot(raiz, app);
} else {
  createRoot(raiz).render(app);
}
