import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '../shared/design/tokens.css';
import '../index.css';
import { migrateLegacyToShared } from '../shared/lib/sharedBirth.js';

migrateLegacyToShared();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
