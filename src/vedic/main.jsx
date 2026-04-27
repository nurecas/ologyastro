import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '../shared/design/tokens.css';
import '../index.css';
import { initSwiss, setEphemerisOptions } from '../astro/ephemeris.js';
import { swissBrowserInit } from '../astro/swissBrowserInit.js';
import { migrateLegacyToShared } from '../shared/lib/sharedBirth.js';
import { useVedic } from './store.js';

// Run before stores rehydrate so the shared blob is populated from any
// legacy v1 keys on first load.
migrateLegacyToShared();

// Vedic mode is sidereal end-to-end. Set the ayanamsa before Swiss boots so
// the very first calc_ut uses it. (Most births in Western will already be
// in localStorage, but Vedic always overrides to sidereal regardless of
// what Western last left set.)
setEphemerisOptions({ zodiac: 'sidereal', ayanamsa: useVedic.getState().ayanamsa });

initSwiss({ browserInit: swissBrowserInit });

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
