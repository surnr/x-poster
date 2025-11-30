/**
 * Core interface that all data sources must implement
 * Makes adding new sources as simple as implementing this interface
 */
export interface DataSource {
  /**
   * Unique identifier for this data source
   */
  getName(): string;

  /**
   * The URL to fetch the listing page from
   */
  getListingUrl(): string;

  /**
   * Extract article links from the listing page HTML
   * @param html - The HTML content of the listing page
   * @returns Array of article URLs
   */
  scrapeArticleLinks(html: string): Promise<string[]>;

  /**
   * Fetch and extract content from a single article
   * @param url - The article URL
   * @returns Scraped article data
   */
  fetchArticleContent(url: string): Promise<ScrapedArticle>;

  /**
   * Get the system prompt for AI generation specific to this source
   * @returns System prompt text
   */
  getSystemPrompt(): string;

  /**
   * Get the user message template for AI generation
   * @param article - The scraped article data
   * @returns User message text
   */
  getUserMessage(article: ScrapedArticle): string;

  /**
   * Maximum character limit for the generated tweet
   */
  getCharacterLimit(): number;
}

/**
 * Represents a scraped article with all necessary metadata
 */
export interface ScrapedArticle {
  url: string;
  title: string;
  content: string;
  imageUrl?: string;
  author?: string;
  publishedAt?: string;
}

/**
 * Structured AI prompt data
 */
export interface AIPrompt {
  systemPrompt: string;
  userMessage: string;
  characterLimit: number;
}
