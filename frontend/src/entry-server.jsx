import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import AppShell from './AppShell';

export function render(url) {
  return renderToString(
    <AppShell
      Router={StaticRouter}
      routerProps={{ location: url }}
    />
  );
}