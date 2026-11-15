import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@hestia/ui';
import App from './App.tsx';
import { adoptStationFromUrl } from './lib/apiBase';

adoptStationFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
