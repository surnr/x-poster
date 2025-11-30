import * as cheerio from "cheerio";

/**
 * Parse HTML and extract content using CSS selectors
 */
export class HTMLParser {
  /**
   * Extract text content from HTML using a CSS selector
   */
  static extractText(html: string, selector: string): string {
    const $ = cheerio.load(html);
    return $(selector).first().text().trim();
  }

  /**
   * Extract multiple text elements from HTML
   */
  static extractTextAll(html: string, selector: string): string[] {
    const $ = cheerio.load(html);
    const results: string[] = [];
    $(selector).each((_, element) => {
      const text = $(element).text().trim();
      if (text) results.push(text);
    });
    return results;
  }

  /**
   * Extract an attribute value from an element
   */
  static extractAttribute(
    html: string,
    selector: string,
    attribute: string
  ): string {
    const $ = cheerio.load(html);
    return $(selector).first().attr(attribute) || "";
  }

  /**
   * Extract multiple attribute values from elements
   */
  static extractAttributeAll(
    html: string,
    selector: string,
    attribute: string
  ): string[] {
    const $ = cheerio.load(html);
    const results: string[] = [];
    $(selector).each((_, element) => {
      const value = $(element).attr(attribute);
      if (value) results.push(value);
    });
    return results;
  }

  /**
   * Extract HTML content from an element
   */
  static extractHTML(html: string, selector: string): string {
    const $ = cheerio.load(html);
    return $(selector).first().html() || "";
  }

  /**
   * Remove specific elements from HTML and return cleaned text
   */
  static cleanHTML(html: string, removeSelectors: string[] = []): string {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    removeSelectors.forEach((selector) => {
      $(selector).remove();
    });

    // Get the cleaned text content
    return $("body").text().trim();
  }

  /**
   * Convert HTML to markdown-like text
   * Removes scripts, styles, nav, and other non-content elements
   */
  static htmlToMarkdown(html: string): string {
    const $ = cheerio.load(html);

    // Remove non-content elements
    $(
      "script, style, nav, header, footer, aside, iframe, noscript, meta, link"
    ).remove();

    // Remove common ad/tracking containers
    $(".ad, .advertisement, .social-share, .comments").remove();

    // Get text content with basic formatting
    let text = $("body").text();

    // Clean up excessive whitespace
    text = text
      .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
      .replace(/[ \t]{2,}/g, " ") // Max 1 consecutive space
      .trim();

    return text;
  }

  /**
   * Check if a URL is absolute, if not make it absolute
   */
  static normalizeUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    try {
      const base = new URL(baseUrl);
      if (url.startsWith("//")) {
        return `${base.protocol}${url}`;
      }
      if (url.startsWith("/")) {
        return `${base.origin}${url}`;
      }
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }
}
