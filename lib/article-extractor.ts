import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { validateUrl } from "@/lib/url-validator";

export type ArticleResult = {
  title: string | null;
  content: string | null;
  excerpt: string | null;
  siteName: string | null;
  byline: string | null;
};

/**
 * Fetches a URL and extracts the clean article content using Mozilla Readability.
 *
 * Security: validates URL (SSRF protection) before fetching.
 * Returns null fields when extraction fails — this is intentional, not an error.
 *
 * @param url - The article URL to extract content from
 */
export async function extractArticle(url: string): Promise<ArticleResult> {
  const empty: ArticleResult = {
    title: null,
    content: null,
    excerpt: null,
    siteName: null,
    byline: null,
  };

  try {
    validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Dropboard/1.0; +https://dropboard.app) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return empty;

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return empty;

    const html = await response.text();

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) return empty;

    return {
      title: article.title ?? null,
      content: article.content ?? null,
      excerpt: article.excerpt ?? null,
      siteName: article.siteName ?? null,
      byline: article.byline ?? null,
    };
  } catch {
    return empty;
  }
}
