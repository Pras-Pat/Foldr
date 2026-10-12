/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { getDomainFavicon } from '../utils/urlMetadata';

interface TabFaviconProps {
  url?: string;
  favicon?: string;
  className?: string;
  id?: string;
  size?: number;
}

/**
 * Bulletproof Tab Favicon renderer with automated multi-tier fallbacks:
 * 1. tab.favicon (if present and loads)
 * 2. Official service icon (YouTube 32x32 png, Google, GitHub, Twitter, etc.)
 * 3. Google S2 high-res favicon service (sz=64)
 * 4. DuckDuckGo icons service (https://icons.duckduckgo.com/ip3/{domain}.ico)
 * 5. Clean minimalist SVG globe placeholder fallback
 */
export const TabFavicon: React.FC<TabFaviconProps> = ({
  url = '',
  favicon = '',
  className = 'w-3.5 h-3.5 object-contain shrink-0 rounded-sm',
  id,
  size = 14,
}) => {
  // Extract host
  let host = '';
  try {
    if (url) {
      const cleanUrl = url.startsWith('http') ? url : `https://${url}`;
      host = new URL(cleanUrl).hostname.replace(/^www\./, '');
    }
  } catch {
    // fallback
  }

  const domainFavicon = getDomainFavicon(url || host);

  // Initial source priority
  const initialSrc = favicon && !favicon.includes('undefined') ? favicon : domainFavicon;

  const [currentSrc, setCurrentSrc] = useState<string>(initialSrc);
  const [attemptIndex, setAttemptIndex] = useState<number>(0);

  // Re-sync when props change
  React.useEffect(() => {
    const nextSrc = favicon && !favicon.includes('undefined') ? favicon : getDomainFavicon(url || host);
    setCurrentSrc(nextSrc);
    setAttemptIndex(0);
  }, [favicon, url, host]);

  const handleError = () => {
    // Fallback cascade
    if (attemptIndex === 0) {
      // Step 2: Domain-specific high reliability favicon
      setAttemptIndex(1);
      if (domainFavicon && domainFavicon !== currentSrc) {
        setCurrentSrc(domainFavicon);
        return;
      }
    }

    if (attemptIndex <= 1 && host) {
      // Step 3: Google S2 service with sz=64
      const googleS2 = `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
      if (googleS2 !== currentSrc) {
        setAttemptIndex(2);
        setCurrentSrc(googleS2);
        return;
      }
    }

    if (attemptIndex <= 2 && host) {
      // Step 4: DuckDuckGo favicon service
      const duckDuckGo = `https://icons.duckduckgo.com/ip3/${host}.ico`;
      if (duckDuckGo !== currentSrc) {
        setAttemptIndex(3);
        setCurrentSrc(duckDuckGo);
        return;
      }
    }

    // Step 5: Clean SVG data URI globe fallback
    setAttemptIndex(4);
    setCurrentSrc(
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='2' y1='12' x2='22' y2='12'/%3E%3Cpath d='M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/%3E%3C/svg%3E"
    );
  };

  return (
    <img
      id={id}
      src={currentSrc}
      alt=""
      onError={handleError}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`${className} bg-transparent select-none`}
    />
  );
};
