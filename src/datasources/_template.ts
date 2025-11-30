import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

/**
 * TEMPLATE: Copy this file to create a new data source
 *
 * Steps to add a new source:
 * 1. Copy this file and rename it (e.g., reddit.ts, producthunt.ts)
 * 2. Rename the class (e.g., Reddit, ProductHunt)
 * 3. Implement all required methods with your source-specific logic
 * 4. Add the new source to src/config/datasources.ts registry
 * 5. Done! It will automatically be included in the rotation
 */
export class DataSourceTemplate implements DataSource {
  getName(): string {
    // Return a unique identifier for this source
    return "TemplateName";
  }

  getListingUrl(): string {
    // Return the URL of the page that lists articles/posts
    // Example: 'https://example.com/latest' or 'https://api.example.com/posts'
    return "https://example.com/listing";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    // Extract article/post URLs from the listing page
    // Use HTMLParser utility methods for CSS selector-based extraction

    // Example:
    // const links = HTMLParser.extractAttributeAll(html, '.article-link', 'href');
    // return links.map(link => HTMLParser.normalizeUrl(link, this.getListingUrl()));

    const links = HTMLParser.extractAttributeAll(
      html,
      ".article-link", // Replace with your CSS selector
      "href"
    );

    return links
      .map((link) => HTMLParser.normalizeUrl(link, this.getListingUrl()))
      .filter((link) => link.startsWith("http"));
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    // Fetch the full article and extract title, content, and optional metadata

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract title - try multiple selectors as fallback
    const title =
      HTMLParser.extractText(html, "h1.article-title") || // Replace with your selector
      HTMLParser.extractText(html, "h1") ||
      HTMLParser.extractText(html, "title") ||
      "Untitled";

    // Extract main content - try multiple selectors
    const content =
      HTMLParser.extractText(html, ".article-body") || // Replace with your selector
      HTMLParser.extractText(html, "article") ||
      HTMLParser.cleanHTML(html, [
        "script",
        "style",
        "nav",
        "header",
        "footer",
        "aside",
        ".ad",
        ".social-share",
      ]);

    // Optional: Extract image, author, published date
    // const imageUrl = HTMLParser.extractAttribute(html, 'meta[property="og:image"]', 'content');
    // const author = HTMLParser.extractText(html, '.author-name');

    return {
      url,
      title: ContentProcessor.cleanText(title),
      content: ContentProcessor.cleanText(content),
      // imageUrl,  // Optional
      // author,    // Optional
    };
  }

  getSystemPrompt(): string {
    // Define the AI's personality and guidelines for this source
    // Should match the tone/style appropriate for your content type

    return `You are [persona description]. Your job is to take content and turn it into engaging tweets.

Guidelines:
- Keep it under [character limit] characters
- Use casual, conversational tone
- No emojis, no hashtags
- Make it sound natural and human
- Include the source link at the end

Output only the tweet text, nothing else.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    // Format the article data into a prompt for the AI
    // Standard format: Title + Content (truncated to 30k chars)

    const truncatedContent = ContentProcessor.truncateContent(article.content);

    return `Title: ${article.title}

Content: ${truncatedContent}

Write a compelling tweet about this. Add the URL at the end: ${article.url}`;
  }

  getCharacterLimit(): number {
    // Return the maximum character limit for tweets from this source
    // Twitter's limit is 280, but you can use lower limits for punchier tweets

    return 280; // Can be 255, 280, or any custom limit
  }
}
