/**
 * Browser entry point.
 *
 * Deliberately thin: build the object graph, mount the shell. Every decision
 * about *what* is wired lives in `src/composition/container.ts`; this file only
 * decides *when*.
 *
 * The graph is built asynchronously because opening IndexedDB is asynchronous,
 * and we would rather find out that browser storage is blocked now than on the
 * officer's first save. pdf.js is not part of that wait — it is imported on the
 * first parse (NFR-3), so first paint costs nothing it does not need.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './composition/app';
import { createContainer } from './composition/container';
import './styles/index.css';

const mount = document.getElementById('root');
if (!mount) throw new Error('Missing #root element');

const root = createRoot(mount);

root.render(
  <StrictMode>
    <p className="text-small text-muted" style={{ padding: '2rem' }}>
      Opening the console…
    </p>
  </StrictMode>,
);

createContainer().then(
  (container) => {
    root.render(
      <StrictMode>
        <App container={container} />
      </StrictMode>,
    );
  },
  (error: unknown) => {
    root.render(
      <StrictMode>
        <p className="callout callout--warning">
          The console could not start: {error instanceof Error ? error.message : String(error)}
        </p>
      </StrictMode>,
    );
  },
);
