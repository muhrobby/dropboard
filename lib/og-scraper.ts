import { validateUrl } from "@/lib/url-validator";

export type OGMetadata = {
  ogImage: string | null;
  ogDescription: string | null;
  faviconUrl: string | null;
};

/**
 * Scrapes Open Graph metadata and favicon URL from a URL.
 * Fetches only the first 32KB of HTML to keep latency low.
 *
 * Security: Validates URL (SSRF protection) via validateUrl before fetching.
 * Silently returns nulls on any failure — this is a best-effort enrichment.
 */
export async function scrapeOGMetadata(url: string): Promise<OGMetadata> {
  const empty: OGMetadata = {
    ogImage: null,
    ogDescription: null,
    faviconUrl: null,
  };

  try {
    validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Dropboard/1.0 (Link Preview)",
        Accept: "text/html",
      },
      redirect: "manual",
    });

    clearTimeout(timeout);

    if (!response.ok) return empty;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return empty;

    // Read first 32KB — enough to capture <head> on virtually all pages
    const reader = response.body?.getReader();
    if (!reader) return empty;

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 32 * 1024;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      // Stop once we've passed </head> — no need to read the body
      if (html.toLowerCase().includes("</head>")) break;
    }

    reader.cancel();

    const origin = new URL(url).origin;

    return {
      ogImage: extractMetaContent(html, "og:image") ?? null,
      ogDescription:
        extractMetaContent(html, "og:description") ??
        extractMetaContent(html, "description") ??
        null,
      faviconUrl: extractFavicon(html, origin),
    };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract content from <meta property="..." content="..."> or <meta name="..." content="..."> */
function extractMetaContent(html: string, key: string): string | undefined {
  // Try property="key" (OG tags)
  const propMatch = html.match(
    new RegExp(
      `<meta[^>]+property=["']${escapeRegex(key)}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (propMatch) return decodeHtmlEntities(propMatch[1].trim());

  // Try content="..." before property="key" (alternate attribute order)
  const propMatchAlt = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapeRegex(key)}["']`,
      "i",
    ),
  );
  if (propMatchAlt) return decodeHtmlEntities(propMatchAlt[1].trim());

  // Try name="key" (standard meta description)
  const nameMatch = html.match(
    new RegExp(
      `<meta[^>]+name=["']${escapeRegex(key)}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );
  if (nameMatch) return decodeHtmlEntities(nameMatch[1].trim());

  // Try content before name
  const nameMatchAlt = html.match(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegex(key)}["']`,
      "i",
    ),
  );
  if (nameMatchAlt) return decodeHtmlEntities(nameMatchAlt[1].trim());

  return undefined;
}

/** Extract the best favicon URL from the HTML <head>. Falls back to /favicon.ico. */
function extractFavicon(html: string, origin: string): string | null {
  // Look for <link rel="icon">, <link rel="shortcut icon">, <link rel="apple-touch-icon">
  const patterns = [
    /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:icon|shortcut icon)["']/i,
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return resolveUrl(match[1].trim(), origin);
    }
  }

  // Fallback: assume /favicon.ico always exists
  return `${origin}/favicon.ico`;
}

/** Resolve a possibly-relative URL to an absolute one. */
function resolveUrl(href: string, origin: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("//")) return `https:${href}`;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${origin}/${href}`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
