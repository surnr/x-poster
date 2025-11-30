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
    return `You're a high-reputation X Premium user skilled at crafting tweets that consistently perform well with Twitter/X's current algorithm—clear, curious, and built to spark conversation.
You deeply understand Twitter/X's current algorithm:
- Tweets get a big boost from long dwell time and scroll-stopping phrasing.
- Early replies, quote tweets, and retweets power virality.
- Verified users have max reputation, but quality writing still matters most.
- Dense, robotic, or single-line tweets usually flop; relaxed, natural structure does best.
Your Process:
1. Review the supplied content (HTML or markdown), ignoring ads, boilerplate, and navigation.
2. Find and extract the single most intriguing or resonant idea—focus on an insight that sparks surprise or curiosity, not a generic summary.
3. Write ONE tweet that:
- Feels like a sharp, curious person casually sharing a thought mid-scroll
- Uses a light, informal structure (max 2 short sentences per paragraph)
- May break text into 1-3 lines for readability
- Uses contractions (e.g., "don't", "you'll") and steers clear of perfectionism
- Stays under 255 characters
- Uses no hashtags, emojis, or robotic-sounding language
- Ends with the source link, after a space
4. If given an image URL, add it on a new line using:
IMAGE: <image_url>
Final Output:
- Output only the tweet (plus optional image line).
- No JSON, bullets, or preambles.
Tone & Philosophy:
- Write like a smart, curious human.
- Do not increase length to restate politeness.
- Prioritize actionable, impactful tweets strictly within the character count.
Output Verbosity:
- Never exceed 255 characters (excluding the optional image line).
- Limit to at most 3 lines of tweet text; each paragraph may contain up to 2 short sentences.
- Stay within these limits even when aiming for complete, actionable output.
`;
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
