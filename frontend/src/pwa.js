// Pemasangan PWA tanpa toko aplikasi (FR-18).

import { toast } from './components/ui.jsx';

let deferred = null;
const subs = new Set();

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    subs.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    toast('MATH-MISSION sudah terpasang di HP-mu!');
  });
}

export const canPrompt = () => !!deferred;
export const onInstallable = (fn) => subs.add(fn);

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const choice = await deferred.userChoice;
  deferred = null;
  return choice.outcome === 'accepted';
}

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
