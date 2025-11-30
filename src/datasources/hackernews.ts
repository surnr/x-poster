import type { DataSource, ScrapedArticle } from "../types";
import { HTMLParser, ContentProcessor } from "../utils";

/**
 * HackerNews data source implementation
 * Scrapes trending tech discussions from news.ycombinator.com
 */
export class HackerNews implements DataSource {
  getName(): string {
    return "HackerNews";
  }

  getListingUrl(): string {
    return "https://news.ycombinator.com/news";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    // Extract article URLs from HN front page
    const links = HTMLParser.extractAttributeAll(html, ".titleline a", "href");

    // Normalize URLs (some might be relative)
    return links
      .map((link) => HTMLParser.normalizeUrl(link, this.getListingUrl()))
      .filter((link) => link.startsWith("http")); // Filter out job postings, etc.
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch article: ${response.statusText}`);
    }

    const html = await response.text();

    // Convert HTML to markdown-like text (removes nav, scripts, etc.)
    const content = HTMLParser.htmlToMarkdown(html);

    // Extract title from HTML
    const title =
      HTMLParser.extractText(html, "title") ||
      HTMLParser.extractText(html, "h1") ||
      "Untitled";

    return {
      url,
      title: ContentProcessor.cleanText(title),
      content: ContentProcessor.cleanText(content),
    };
  }

  getSystemPrompt(): string {
    return `You're a high-reputation X Premium user (Tweepcred 100). You craft human-first tweets that hit the algorithm just right — clear, curious, and conversation-sparking.

You understand Twitter/X's current algorithm in depth:
- Long dwell time and scroll-stopping phrasing = huge boost.
- Replies, quote tweets, and early retweets = viral fuel.
- Verified users get max reputation — but writing style still matters.
- Dense, robotic, one-line tweets fail. Natural structure wins.

Your task:
1. Read the provided content (HTML or markdown). Ignore ads, boilerplate, or nav clutter.
2. Extract the *one most interesting or resonant idea*. Not a dry summary — the insight that makes someone go "huh" or "wow" or "is that true?"
3. Write ONE tweet that:
   - Feels like a smart person casually sharing an idea mid-scroll
   - Uses light, informal structure — 2 short sentences max per paragraph
   - Breaks text across 1-3 lines (if helpful) so it's readable and scannable
   - Uses contractions ("don't", "you'll") and skips perfection
   - Is under 255 characters
   - Does NOT use hashtags, emojis, or robotic tone
   - Ends with the source link (space before the URL)
4. If an image URL is provided, add it on a new line:
   IMAGE: <image_url>

Final Output:
- Just the tweet (with optional image line).
- No JSON, no bullet points, no "Here's your tweet:" preamble.

Write it like a sharp, curious human would.`;
  }

  getUserMessage(article: ScrapedArticle): string {
    const truncatedContent = ContentProcessor.truncateContent(article.content);

    return `You'll be given a Hacker News article with the following fields.

URL: ${article.url}

Article content:
${truncatedContent}

What to do:
- Read the article.
- Extract the single biggest takeaway or sharpest point.
- Write one tweet, in a natural, human way — like a founder, dev, or tech-savvy user would casually post it.
- Break it into 2-3 short lines if that makes it more readable.
- Add the article link at the end of the tweet (space before it).

Output:
Only the tweet text. No explanation, markdown, or JSON.`;
  }

  getCharacterLimit(): number {
    return 255;
  }
}
