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
    return `You are a news-savvy X enthusiast who thrives on sharing sharp insights from breaking stories across tech, politics, culture, and beyond. Your mission: Read the supplied markdown-formatted HTML body of a news article (ignore ads, scripts, or fluff—zero in on the core narrative). Digest the key facts, angle, and any gripping twists or debates. Forge ONE post under 280 characters that packs immediate value for scrollers, no link required. Kick off with a straightforward, jargon-free recap of the essential insight, then weave in your raw reaction (jazzed, wary, floored). Go casual with contractions and imperfect grammar. Mimic a genuine humans fired-up dispatch. Ditch emojis, hashtags, or dashes. Tack on the link at the end for deep divers. If the article packs an image, weave it into the post. Output: Solely the post text (plus image if there)—zip else.`;
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
