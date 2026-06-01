// Dynamic fetch patch for read-only browser environments (where window.fetch is a getter only)
(function() {
  try {
    const originalFetch = window.fetch || globalThis.fetch || (typeof self !== 'undefined' ? self.fetch : undefined);
    let overriddenFetch = originalFetch;

    const descriptor = {
      configurable: true,
      enumerable: true,
      get() {
        return overriddenFetch;
      },
      set(val: any) {
        overriddenFetch = val;
      }
    };

    try {
      Object.defineProperty(globalThis, 'fetch', descriptor);
    } catch (e1) {}

    try {
      Object.defineProperty(window, 'fetch', descriptor);
    } catch (e2) {}

    if (typeof self !== 'undefined') {
      try {
        Object.defineProperty(self, 'fetch', descriptor);
      } catch (e3) {}
    }
  } catch (err) {
    console.warn('Unable to patch fetch getter/setter descriptor in main.tsx', err);
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
