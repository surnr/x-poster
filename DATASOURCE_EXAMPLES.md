# Data Source Examples

This file contains example implementations for popular platforms to help you quickly add new sources.

## Reddit

```typescript
// src/datasources/reddit.ts
import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

export class Reddit implements DataSource {
  private subreddit = "technology"; // Change to your preferred subreddit

  getName(): string {
    return "Reddit";
  }

  getListingUrl(): string {
    return `https://www.reddit.com/r/${this.subreddit}/hot.json?limit=10`;
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    // Reddit returns JSON, not HTML
    try {
      const data = JSON.parse(html);
      return data.data.children
        .filter((post: any) => !post.data.is_self && post.data.url)
        .map((post: any) => post.data.url)
        .slice(0, 5);
    } catch (error) {
      console.error("Failed to parse Reddit JSON:", error);
      return [];
    }
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const title =
      HTMLParser.extractText(html, "h1") ||
      HTMLParser.extractText(html, "title") ||
      "Untitled";
    const content = HTMLParser.htmlToMarkdown(html);

    return {
      url,
      title: ContentProcessor.cleanText(title),
      content: ContentProcessor.cleanText(content),
    };
  }

  getSystemPrompt(): string {
    return `You're a Reddit power user who shares interesting finds. Create casual, conversational tweets that feel authentic. Keep it under 255 characters. No emojis or hashtags. Make it sound like you're genuinely excited about what you found. End with the link.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    const content = ContentProcessor.truncateContent(article.content);
    return `Found on r/${this.subreddit}:\n\nTitle: ${article.title}\n\nContent: ${content}\n\nWrite a natural tweet about this. Add link: ${article.url}`;
  }

  getCharacterLimit(): number {
    return 255;
  }
}
```

## Product Hunt

```typescript
// src/datasources/producthunt.ts
import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

export class ProductHunt implements DataSource {
  getName(): string {
    return "ProductHunt";
  }

  getListingUrl(): string {
    return "https://www.producthunt.com/";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    const links = HTMLParser.extractAttributeAll(
      html,
      'a[href*="/posts/"]',
      "href"
    );

    return links
      .map((link) => HTMLParser.normalizeUrl(link, this.getListingUrl()))
      .filter((link) => link.includes("/posts/"))
      .slice(0, 5);
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const title =
      HTMLParser.extractText(html, "h1") ||
      HTMLParser.extractText(html, '[data-test="post-name"]');
    const description =
      HTMLParser.extractText(html, '[data-test="post-tagline"]') ||
      HTMLParser.extractText(html, 'meta[property="og:description"]');

    return {
      url,
      title: ContentProcessor.cleanText(title || "Untitled"),
      content: ContentProcessor.cleanText(description || ""),
    };
  }

  getSystemPrompt(): string {
    return `You're a product enthusiast who discovers cool new tools. Share Product Hunt finds in a way that makes people curious. Under 255 chars. Natural, no hype. No emojis or hashtags. End with link.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    return `Product: ${article.title}\n\nDescription: ${article.content}\n\nCreate a tweet that makes people want to check it out. Link: ${article.url}`;
  }

  getCharacterLimit(): number {
    return 255;
  }
}
```

## Dev.to

```typescript
// src/datasources/devto.ts
import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

export class DevTo implements DataSource {
  getName(): string {
    return "DevTo";
  }

  getListingUrl(): string {
    return "https://dev.to/top/week";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    const links = HTMLParser.extractAttributeAll(
      html,
      ".crayons-story__title a",
      "href"
    );

    return links
      .map((link) => HTMLParser.normalizeUrl(link, "https://dev.to"))
      .slice(0, 5);
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const title = HTMLParser.extractText(html, "h1");
    const content =
      HTMLParser.extractText(html, "article .crayons-article__body") ||
      HTMLParser.htmlToMarkdown(html);

    return {
      url,
      title: ContentProcessor.cleanText(title || "Untitled"),
      content: ContentProcessor.cleanText(content),
    };
  }

  getSystemPrompt(): string {
    return `You're a developer who shares interesting technical articles. Keep tweets casual and accessible. Under 255 chars. No jargon overload. No emojis or hashtags. End with link.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    const content = ContentProcessor.truncateContent(article.content);
    return `Article: ${article.title}\n\n${content}\n\nWrite a developer-friendly tweet. Link: ${article.url}`;
  }

  getCharacterLimit(): number {
    return 255;
  }
}
```

## Medium

```typescript
// src/datasources/medium.ts
import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

export class Medium implements DataSource {
  getName(): string {
    return "Medium";
  }

  getListingUrl(): string {
    return "https://medium.com/tag/technology";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    const links = HTMLParser.extractAttributeAll(
      html,
      'article a[href*="/p/"]',
      "href"
    );

    return links
      .map((link) => {
        // Medium uses relative URLs
        if (link.startsWith("/")) {
          return `https://medium.com${link}`;
        }
        return link;
      })
      .filter((link) => link.includes("medium.com"))
      .slice(0, 5);
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const title =
      HTMLParser.extractText(html, "h1") ||
      HTMLParser.extractText(html, 'meta[property="og:title"]');
    const content =
      HTMLParser.extractText(html, "article") ||
      HTMLParser.htmlToMarkdown(html);

    return {
      url,
      title: ContentProcessor.cleanText(title || "Untitled"),
      content: ContentProcessor.cleanText(content),
    };
  }

  getSystemPrompt(): string {
    return `You share thought-provoking articles from Medium. Create tweets that highlight the key insight. Under 280 chars. Thoughtful tone. No emojis or hashtags. End with link.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    const content = ContentProcessor.truncateContent(article.content);
    return `Title: ${article.title}\n\n${content}\n\nWhat's the most interesting takeaway? Write a tweet. Link: ${article.url}`;
  }

  getCharacterLimit(): number {
    return 280;
  }
}
```

## GitHub Trending

```typescript
// src/datasources/github.ts
import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

export class GitHubTrending implements DataSource {
  getName(): string {
    return "GitHubTrending";
  }

  getListingUrl(): string {
    return "https://github.com/trending";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    const links = HTMLParser.extractAttributeAll(
      html,
      "article.Box-row h2 a",
      "href"
    );

    return links.map((link) => `https://github.com${link}`).slice(0, 5);
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    const title = HTMLParser.extractText(html, 'strong[itemprop="name"] a');
    const description =
      HTMLParser.extractText(html, "[data-pjax-container] p") ||
      HTMLParser.extractText(html, 'meta[property="og:description"]');
    const stars = HTMLParser.extractText(html, "#repo-stars-counter-star");

    return {
      url,
      title: ContentProcessor.cleanText(title || "Untitled"),
      content: `${description} (${stars} stars)`,
    };
  }

  getSystemPrompt(): string {
    return `You discover cool open source projects. Share GitHub repos in a way that makes devs curious. Under 255 chars. Highlight what makes it interesting. No emojis or hashtags. End with link.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    return `Repo: ${article.title}\n\n${article.content}\n\nWhy would devs care about this? Write a tweet. Link: ${article.url}`;
  }

  getCharacterLimit(): number {
    return 255;
  }
}
```

## Using These Examples

1. Copy the code to `src/datasources/[name].ts`
2. Export it from `src/datasources/index.ts`:
   ```typescript
   export { Reddit } from "./reddit";
   ```
3. Add to `src/config/datasources.ts`:

   ```typescript
   import { Reddit } from "../datasources/reddit";

   export const DATA_SOURCES: DataSource[] = [
     new HackerNews(),
     new TechCrunch(),
     new YahooFinance(),
     new Reddit(), // ← Add here
   ];
   ```

Done! The new source is now in rotation.

## Tips

- **Test selectors first**: Visit the site and use browser DevTools to verify CSS selectors work
- **Handle JSON APIs**: Some sites (like Reddit) return JSON - parse it instead of using HTML selectors
- **Fallback selectors**: Always provide multiple selector options for title/content extraction
- **Rate limiting**: Be respectful - don't scrape too aggressively
- **User agents**: Some sites block scrapers - add appropriate User-Agent headers if needed
- **Authentication**: For APIs requiring auth, add credentials to Env interface and use secrets

## Testing a New Source

```typescript
// Quick test in src/index.ts
const source = new YourNewSource();
const listing = await fetch(source.getListingUrl());
const html = await listing.text();
const links = await source.scrapeArticleLinks(html);
console.log("Found links:", links);

const article = await source.fetchArticleContent(links[0]);
console.log("Article:", article);
```

Then test via the trigger endpoint:

```bash
curl https://your-worker.workers.dev/trigger
```
