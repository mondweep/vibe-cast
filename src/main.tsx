/**
 * Browser entry point.
 *
 * Deliberately thin: it mounts the UI driving adapter and nothing else. Wiring
 * the pdf.js `BulletinSource` and the IndexedDB `ReportRepository` belongs in
 * the application composition root, which passes `parseBulletin` into
 * `Bootstrap`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Bootstrap } from './adapters/ui/bootstrap';
import './styles/index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
