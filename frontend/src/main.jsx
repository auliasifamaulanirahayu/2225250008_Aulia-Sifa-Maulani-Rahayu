import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './styles/tailwind.css';
import App from './App.jsx';
import { loadState, state } from './state.js';
import { initAuth } from './lib/auth.js';
import { initPwa } from './pwa.js';
import { startAutoSync } from './store/sync.js';
import { toast } from './components/ui.jsx';

async function init() {
  await loadState();
  await initAuth();
  if (state.passwordRecovery) location.hash = '#/reset-password'; // dibuka dari email lupa password
  initPwa();
  createRoot(document.getElementById('app')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  document.getElementById('boot')?.remove();
  startAutoSync();

  const updateSW = registerSW({
    onNeedRefresh() {
      toast('Versi baru MATH-MISSION tersedia.', { action: 'Muat ulang', onAction: () => updateSW(true), duration: 0 });
    },
    onOfflineReady() {
      toast('MATH-MISSION siap dipakai tanpa internet.');
    },
  });
}

init();
