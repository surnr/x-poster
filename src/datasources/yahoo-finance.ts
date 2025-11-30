import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

/**
 * Yahoo Finance data source implementation
 * Scrapes crypto and finance news from finance.yahoo.com
 */
export class YahooFinance implements DataSource {
  getName(): string {
    return "YahooFinance";
  }

  getListingUrl(): string {
    return "https://finance.yahoo.com/topic/crypto/";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    // Extract article URLs from Yahoo Finance crypto page
    const links = HTMLParser.extractAttributeAll(html, ".titles", "href");

    // Normalize relative URLs
    return links
      .map((link) => HTMLParser.normalizeUrl(link, this.getListingUrl()))
      .filter((link) => link.startsWith("http"));
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract title and content using Yahoo Finance specific selectors
    const title =
      HTMLParser.extractText(html, ".cover-title") ||
      HTMLParser.extractText(html, "h1") ||
      HTMLParser.extractText(html, "title");

    const content =
      HTMLParser.extractText(html, ".body") ||
      HTMLParser.extractText(html, "article") ||
      HTMLParser.cleanHTML(html, [
        "script",
        "style",
        "nav",
        "header",
        "footer",
        "aside",
        ".ad",
      ]);

    return {
      url,
      title: ContentProcessor.cleanText(title || "Untitled"),
      content: ContentProcessor.cleanText(content),
    };
  }

  getSystemPrompt(): string {
    return `You are a Web3 founder who trades crypto and stocks. Your job is to take any given content and turn it into one short tweet. Use simple, everyday words that anyone can understand. Keep it under 255 characters. No emojis, no hyphens, no em dashes. Make it sound like a real person talking. Just output the tweet, nothing else.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    const truncatedContent = ContentProcessor.truncateContent(article.content);

    return `Title: ${article.title}

Content: ${truncatedContent}`;
  }

  getCharacterLimit(): number {
    return 255;
  }
}
