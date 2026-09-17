import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './ui.css';

const container = document.getElementById('root');
if (container !== null) createRoot(container).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
