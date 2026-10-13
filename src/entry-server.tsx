import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

/**
 * Renderiza a página inteira para HTML no build (plugins/prerender.ts).
 * O main.tsx depois "hidrata" esse HTML no navegador.
 */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
