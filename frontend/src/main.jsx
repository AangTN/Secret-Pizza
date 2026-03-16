import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createRoot, hydrateRoot } from 'react-dom/client';
import AppShell from './AppShell';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/global.css';

const rootElement = document.getElementById('root');

const app = (
  <React.StrictMode>
    <AppShell Router={BrowserRouter} />
  </React.StrictMode>
);

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}