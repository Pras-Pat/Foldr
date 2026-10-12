/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Clean and normalize a raw URL input.
 */
export function normalizeUrl(input: string): string {
  let cleaned = input.trim();
  if (!cleaned) return '';
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  return cleaned;
}

/**
 * Decode HTML entities like &amp;, &#39;, &quot;, &lt;, &gt;
 */
function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Get accurate, high-reliability favicon URL based on hostname and popular domains.
 * Uses domain-specific official CDNs or DuckDuckGo / Google S2 favicons.
 */
export function getDomainFavicon(rawUrlOrHost: string): string {
  let host = rawUrlOrHost.trim().toLowerCase();
  try {
    if (host.startsWith('http://') || host.startsWith('https://')) {
      host = new URL(host).hostname.toLowerCase();
    }
  } catch {
    // fallback
  }
  host = host.replace(/^www\./, '');

  // 1. YouTube - Use ultra-fast Google S2 favicon service for instant load matching other icons, with YouTube CDN fallback
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    return 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64';
  }

  // 2. Google Workspace & Google Services (Docs, Sheets, Slides, Drive)
  if (host === 'docs.google.com') {
    return 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico';
  }
  if (host.includes('drive.google.com')) {
    return 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png';
  }
  if (host.includes('google.com')) {
    return 'https://www.google.com/favicon.ico';
  }

  // 3. Craft Docs (craft.do / craft.me)
  if (host.includes('craft.do') || host.includes('craft.me')) {
    return 'https://www.craft.do/favicon.ico';
  }

  // 3. GitHub
  if (host === 'github.com') {
    return 'https://github.githubassets.com/favicons/favicon.svg';
  }

  // 4. Twitter / X
  if (host === 'twitter.com' || host === 'x.com') {
    return 'https://abs.twimg.com/favicons/twitter.3.ico';
  }

  // 5. Reddit
  if (host.includes('reddit.com')) {
    return 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png';
  }

  // 6. Amazon
  if (host.includes('amazon.')) {
    return 'https://www.amazon.com/favicon.ico';
  }

  // 7. Notion
  if (host.includes('notion.so') || host.includes('notion.site')) {
    return 'https://www.notion.so/images/favicon.ico';
  }

  // 8. Figma
  if (host.includes('figma.com')) {
    return 'https://static.figma.com/app/icon/1/favicon.svg';
  }

  // 9. LinkedIn
  if (host.includes('linkedin.com')) {
    return 'https://static.licdn.com/aero-v1/sc/h/al2o9zrvru7aqj8e1x2rzsrca';
  }

  // 10. Wikipedia
  if (host.includes('wikipedia.org')) {
    return 'https://en.wikipedia.org/static/favicon/wikipedia.ico';
  }

  // 11. Spotify
  if (host.includes('spotify.com')) {
    return 'https://open.spotifycdn.com/cdn/images/favicon32.96b09272.png';
  }

  // 12. Netflix
  if (host.includes('netflix.com')) {
    return 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico';
  }

  // Universal high-res Google S2 service with DuckDuckGo fallback
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}

/**
 * Generate a smart fallback title based on URL structure, domain, and path slug.
 * Highly customized for Amazon, Google Docs/Sheets/Slides, YouTube, GitHub, Twitter, Reddit, etc.
 */
export function getSmartFallbackTitle(rawUrl: string): string {
  const url = normalizeUrl(rawUrl);
  try {
    const urlObj = new URL(url);
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = urlObj.pathname;

    // 1. YouTube
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const v = urlObj.searchParams.get('v');
      if (v) return `YouTube Video (${v.slice(0, 6)}...)`;
      if (pathname.includes('/shorts/')) {
        const shortId = pathname.split('/shorts/')[1]?.split('/')[0];
        return `YouTube Short (${shortId || ''})`;
      }
      return 'YouTube Video';
    }

    // 2. Google Workspace: Docs, Sheets, Slides, Forms, Drive
    if (host === 'docs.google.com') {
      if (pathname.includes('/document/')) return 'Google Doc';
      if (pathname.includes('/spreadsheets/')) return 'Google Sheet';
      if (pathname.includes('/presentation/')) return 'Google Slides';
      if (pathname.includes('/forms/')) return 'Google Form';
      return 'Google Docs Document';
    }
    if (host === 'drive.google.com') {
      if (pathname.includes('/folders/')) return 'Google Drive Folder';
      return 'Google Drive File';
    }

    // 2.5 Craft Docs (craft.do / craft.me)
    if (host.includes('craft.do') || host.includes('craft.me')) {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        // e.g. /d/slug or /share/slug or just /slug
        const lastPart = parts[parts.length - 1];
        if (lastPart && !lastPart.match(/^[0-9a-fA-F-]{20,}$/)) {
          const readable = decodeURIComponent(lastPart).replace(/[-_+]/g, ' ').trim();
          if (readable.length > 2) {
            return `Craft: ${readable.charAt(0).toUpperCase() + readable.slice(1)}`;
          }
        }
      }
      return 'Craft Document';
    }

    // 3. Amazon: Extract product slug from URL (e.g. /Product-Name-Here/dp/B0D1...)
    if (host.includes('amazon.')) {
      const dpMatch = pathname.match(/\/([^/]+)\/dp\/([A-Za-z0-9]+)/);
      if (dpMatch && dpMatch[1] && dpMatch[1] !== 'dp') {
        const cleanedProduct = decodeURIComponent(dpMatch[1])
          .replace(/[-_+]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanedProduct.length > 2) {
          return cleanedProduct.charAt(0).toUpperCase() + cleanedProduct.slice(1);
        }
      }
      const asinMatch = pathname.match(/\/dp\/([A-Za-z0-9]+)/);
      if (asinMatch) {
        return `Amazon Product (${asinMatch[1]})`;
      }
      return 'Amazon';
    }

    // 4. Twitter / X
    if (host === 'twitter.com' || host === 'x.com') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[1] === 'status') {
        return `Post by @${parts[0]} on X`;
      }
      if (parts.length === 1) {
        return `@${parts[0]} on X`;
      }
      return 'X (Twitter)';
    }

    // 5. GitHub
    if (host === 'github.com') {
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length === 1) return `GitHub: ${parts[0]}`;
      if (parts.length === 2) return `GitHub: ${parts[0]}/${parts[1]}`;
      if (parts.length >= 4 && (parts[2] === 'issues' || parts[2] === 'pull')) {
        return `GitHub: ${parts[0]}/${parts[1]} #${parts[3]}`;
      }
      if (parts.length >= 3) return `GitHub: ${parts[0]}/${parts[1]} (${parts[2]})`;
      return 'GitHub';
    }

    // 6. Reddit
    if (host.includes('reddit.com')) {
      const match = pathname.match(/\/r\/([^/]+)\/comments\/[^/]+\/([^/]+)/);
      if (match && match[2]) {
        const postSlug = decodeURIComponent(match[2]).replace(/[-_]/g, ' ').trim();
        return `r/${match[1]}: ${postSlug.charAt(0).toUpperCase() + postSlug.slice(1)}`;
      }
      const subMatch = pathname.match(/\/r\/([^/]+)/);
      if (subMatch) return `r/${subMatch[1]}`;
      return 'Reddit';
    }

    // 7. General Websites: Clean domain name and last path segment
    const domainParts = host.split('.');
    let baseName = domainParts[0] || host;
    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);

    if (pathname && pathname !== '/') {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        let lastSegment = segments[segments.length - 1];
        // Strip common file extensions (.html, .php, etc.)
        lastSegment = lastSegment.replace(/\.(html|htm|php|aspx|jsp)$/i, '');
        if (lastSegment && !lastSegment.match(/^[0-9a-fA-F-]{20,}$/)) {
          const cleanSlug = decodeURIComponent(lastSegment)
            .replace(/[-_+]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (cleanSlug.length > 1 && cleanSlug.length < 70) {
            return `${baseName} - ${cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1)}`;
          }
        }
      }
    }

    return baseName || host;
  } catch {
    return rawUrl;
  }
}

/**
 * Clean up redundant suffixes from fetched page titles
 * E.g., "Taylor Swift - Blank Space - YouTube" -> "Taylor Swift - Blank Space"
 * E.g., "Apple AirPods Pro : Amazon.com" -> "Apple AirPods Pro"
 */
function cleanTitle(rawTitle: string, hostname: string): string {
  let title = decodeHtmlEntities(rawTitle).trim();
  if (!title) return '';

  const host = hostname.toLowerCase();

  // YouTube
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    title = title.replace(/\s*-\s*YouTube$/i, '');
  }

  // Amazon
  if (host.includes('amazon.')) {
    title = title
      .replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, '')
      .replace(/\s*\|\s*Amazon\.[a-z.]+.*$/i, '')
      .replace(/\s*-\s*Amazon\.[a-z.]+.*$/i, '');
  }

  // Google Docs
  if (host === 'docs.google.com') {
    title = title
      .replace(/\s*-\s*Google Docs$/i, '')
      .replace(/\s*-\s*Google Sheets$/i, '')
      .replace(/\s*-\s*Google Slides$/i, '')
      .replace(/\s*-\s*Google Forms$/i, '');
  }

  // Wikipedia
  if (host.includes('wikipedia.org')) {
    title = title.replace(/\s*-\s*Wikipedia$/i, '');
  }

  // Twitter / X
  if (host === 'twitter.com' || host === 'x.com') {
    title = title.replace(/\s*\/\s*X$/i, '').replace(/\s*on Twitter.*$/i, '');
  }

  return title.trim();
}

/**
 * Fetch rich title and favicon for any URL from the web.
 * Uses public APIs with CORS support (Microlink, YouTube oEmbed, Twitter oEmbed, GitHub API, Noembed).
 * Timeout protected with AbortController to never hang.
 */
export async function fetchUrlMetadata(
  rawUrl: string,
  timeoutMs: number = 4500
): Promise<{ title: string; favicon: string }> {
  const url = normalizeUrl(rawUrl);
  const fallback = getSmartFallbackTitle(url);

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    return {
      title: fallback,
      favicon: getDomainFavicon(rawUrl),
    };
  }

  const defaultFavicon = getDomainFavicon(hostname);

  // Helper with AbortController timeout
  const fetchWithTimeout = async (requestUrl: string): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(requestUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  // 1. YouTube Video Title via YouTube oEmbed or Noembed
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    const youtubeFavicon = 'https://www.youtube.com/s/desktop/f17ec1e9/img/favicon_32x32.png';
    try {
      const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
      const res = await fetchWithTimeout(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.title && typeof data.title === 'string' && data.title.trim()) {
          return {
            title: cleanTitle(data.title, hostname),
            favicon: youtubeFavicon,
          };
        }
      }
    } catch {
      // Fallback below
    }
    return {
      title: fallback,
      favicon: youtubeFavicon,
    };
  }

  // 2. Twitter / X oEmbed
  if (hostname === 'twitter.com' || hostname === 'x.com') {
    const xFavicon = 'https://abs.twimg.com/favicons/twitter.3.ico';
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
      const res = await fetchWithTimeout(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.author_name) {
          const textMatch = data.html ? data.html.match(/<p[^>]*>(.*?)<\/p>/) : null;
          let tweetSnippet = '';
          if (textMatch && textMatch[1]) {
            tweetSnippet = textMatch[1].replace(/<[^>]*>/g, '').slice(0, 60);
          }
          const tweetTitle = tweetSnippet
            ? `@${data.author_name}: "${tweetSnippet}..."`
            : `Post by @${data.author_name} on X`;
          return {
            title: cleanTitle(tweetTitle, hostname),
            favicon: xFavicon,
          };
        }
      }
    } catch {
      // Fallback below
    }
    return {
      title: fallback,
      favicon: xFavicon,
    };
  }

  // 3. Reddit oEmbed
  if (hostname.includes('reddit.com')) {
    const redditFavicon = 'https://www.redditstatic.com/shreddit/assets/favicon/192x192.png';
    try {
      const res = await fetchWithTimeout(`https://www.reddit.com/oembed?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title && typeof data.title === 'string' && data.title.trim()) {
          return {
            title: cleanTitle(data.title, hostname),
            favicon: redditFavicon,
          };
        }
      }
    } catch {
      // Fallback below
    }
    return {
      title: fallback,
      favicon: redditFavicon,
    };
  }

  // 4. GitHub API
  if (hostname === 'github.com') {
    const githubFavicon = 'https://github.githubassets.com/favicons/favicon.svg';
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length === 2) {
        const res = await fetchWithTimeout(`https://api.github.com/repos/${parts[0]}/${parts[1]}`);
        if (res.ok) {
          const data = await res.json();
          if (data.full_name) {
            const desc = data.description ? ` - ${data.description.slice(0, 50)}...` : '';
            return {
              title: `${data.full_name}${desc}`,
              favicon: githubFavicon,
            };
          }
        }
      } else if (parts.length >= 4 && (parts[2] === 'issues' || parts[2] === 'pull')) {
        const res = await fetchWithTimeout(
          `https://api.github.com/repos/${parts[0]}/${parts[1]}/issues/${parts[3]}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.title) {
            return {
              title: `${parts[0]}/${parts[1]} #${parts[3]}: ${data.title}`,
              favicon: githubFavicon,
            };
          }
        }
      }
    } catch {
      // Fallback below
    }
    return {
      title: fallback,
      favicon: githubFavicon,
    };
  }

  // 5. Universal Metadata Scraper via Microlink API (CORS enabled, handles Google Docs, Amazon, NYT, blogs, etc.)
  try {
    const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;
    const res = await fetchWithTimeout(microlinkUrl);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        const pageTitle = json.data.title;
        const iconUrl = json.data.logo?.url || json.data.image?.url;
        if (pageTitle && typeof pageTitle === 'string' && pageTitle.trim()) {
          // If page title is generic login redirect for google docs, keep smart fallback
          if (
            hostname === 'docs.google.com' &&
            pageTitle.toLowerCase().includes('sign in')
          ) {
            return { title: fallback, favicon: defaultFavicon };
          }
          return {
            title: cleanTitle(pageTitle, hostname),
            favicon: iconUrl || defaultFavicon,
          };
        }
      }
    }
  } catch {
    // Network or timeout
  }

  // 6. Noembed universal fallback
  try {
    const res = await fetchWithTimeout(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.title && typeof data.title === 'string' && data.title.trim()) {
        return {
          title: cleanTitle(data.title, hostname),
          favicon: defaultFavicon,
        };
      }
    }
  } catch {
    // Fallback to smart heuristic
  }

  return {
    title: fallback,
    favicon: defaultFavicon,
  };
}
