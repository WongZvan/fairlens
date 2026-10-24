import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppShell } from './app/AppShell.js';
import './design-system/tokens.css';
import './design-system/base.css';
import './app/shell.css';
import './features/editor-mockup/mockup.css';
import './features/editor-mockup/paper.css';
import './i18n/index.js';

// 四声部字体（fontsource 打包分发；楷体走系统回退链）
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans-condensed/400.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-serif-sc/700.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>,
);
