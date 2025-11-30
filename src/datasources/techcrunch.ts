import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

/**
 * TechCrunch data source implementation
 * Scrapes AI and startup news from techcrunch.com
 */
export class TechCrunch implements DataSource {
  getName(): string {
    return "TechCrunch";
  }

  getListingUrl(): string {
    return "https://techcrunch.com/category/artificial-intelligence/";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    // Extract article URLs from TechCrunch AI category page
    const links = HTMLParser.extractAttributeAll(
      html,
      ".loop-card__title-link",
      "href"
    );

    return links.filter((link) => link.startsWith("http"));
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();

    // Try multiple selectors for title (TechCrunch has different layouts)
    let title = HTMLParser.extractText(html, ".article-hero__title");
    if (!title) {
      title = HTMLParser.extractText(html, ".wp-block-post-title");
    }
    if (!title) {
      title = HTMLParser.extractText(html, "h1");
    }
    if (!title) {
      title = HTMLParser.extractText(html, "title");
    }

    // Extract main content
    const content =
      HTMLParser.extractText(html, ".entry-content") ||
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

    return {
      url,
      title: ContentProcessor.cleanText(title || "Untitled"),
      content: ContentProcessor.cleanText(content),
    };
  }

  getSystemPrompt(): string {
    return `You are a news-savvy X enthusiast, passionate about sharing sharp takes on breaking stories in tech, politics, culture, and more. Your role: Review the provided markdown-formatted HTML body of a news article—skip ads, scripts, or filler, and focus exclusively on the main narrative. Digest the key facts, critical angle, and any compelling twists or controversies. Create ONE post, max 280 characters, that delivers instant value to casual scrollers. Start with a clear, jargon-free summary of the core insight, then layer in your personal reaction (excited, skeptical, amazed, etc). Use casual language, contractions, and relaxed grammar. Emulate the vibe of an authentic, fired-up enthusiast. No emojis, hashtags, or dashes. Always add the link at the end for those who want more. If the article features an image, seamlessly incorporate it into your post. Output only the written post (and image if present)—nothing else.
After creating your post, validate in 1-2 lines that it captures the article's main point, fits the character limit, and matches the requested tone; proceed or minimally self-correct if it does not.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    const truncatedContent = ContentProcessor.truncateContent(article.content);

    return `Title: ${article.title}

Content: ${truncatedContent}`;
  }

  getCharacterLimit(): number {
    return 280;
  }
}
