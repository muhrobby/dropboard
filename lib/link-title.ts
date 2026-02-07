import { validateUrl, URLValidationError } from "@/lib/url-validator";

/**
 * Fetch the <title> tag from a URL.
 * Falls back to the URL hostname on failure.
 *
 * Security: Validates URL to prevent SSRF attacks before fetching.
 */
export async function fetchLinkTitle(url: string): Promise<string> {
  try {
    // Security: Validate URL to prevent SSRF attacks
    // This blocks access to internal networks, localhost, and metadata services
    validateUrl(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Dropboard/1.0 (Link Preview)",
        Accept: "text/html",
      },
      // Security: Limit redirect hops to prevent redirect-based SSRF
      redirect: "manual",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return getFallbackTitle(url);
    }

    // Only parse HTML content
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return getFallbackTitle(url);
    }

    // Read only first 16KB to find the title
    const reader = response.body?.getReader();
    if (!reader) return getFallbackTitle(url);

    let html = "";
    const decoder = new TextDecoder();
    const maxBytes = 16 * 1024;

    while (html.length < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Check if we've found the closing title tag
      if (html.includes("</title>")) break;
    }

    reader.cancel();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Decode HTML entities and trim
      const title = titleMatch[1]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();

      if (title.length > 0) {
        return title.slice(0, 255);
      }
    }

    return getFallbackTitle(url);
  } catch (error) {
    // Log validation errors for security monitoring
    if (error instanceof URLValidationError) {
      console.warn("[Security] URL validation failed:", error.message);
    }
    return getFallbackTitle(url);
  }
}

function getFallbackTitle(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.slice(0, 255);
  }
}
