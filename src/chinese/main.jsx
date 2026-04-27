import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '../shared/design/tokens.css';
import '../index.css';
import { initSwiss, setEphemerisOptions } from '../astro/ephemeris.js';
import { swissBrowserInit } from '../astro/swissBrowserInit.js';
import { migrateLegacyToShared } from '../shared/lib/sharedBirth.js';

migrateLegacyToShared();

// BaZi uses tropical Sun longitudes for solar-term boundaries.
setEphemerisOptions({ zodiac: 'tropical' });

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
