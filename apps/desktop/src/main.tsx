import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppShell } from './app/AppShell.js';
import './design-system/tokens.css';
import './design-system/base.css';
import './app/shell.css';
import './i18n/index.js';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
