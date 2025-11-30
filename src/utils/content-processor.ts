/**
 * Content processing utilities for article text
 */
export class ContentProcessor {
  /**
   * Maximum characters to send to AI (30,000 as per n8n workflow)
   */
  static readonly MAX_CONTENT_LENGTH = 30000;

  /**
   * Truncate content to maximum length
   */
  static truncateContent(
    content: string,
    maxLength: number = ContentProcessor.MAX_CONTENT_LENGTH
  ): string {
    if (content.length <= maxLength) {
      return content;
    }

    // Truncate at word boundary to avoid cutting mid-word
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > maxLength * 0.9) {
      // If we found a space in the last 10%, use it
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
  }

  /**
   * Clean and normalize text content
   */
  static cleanText(text: string): string {
    return (
      text
        // Remove multiple consecutive spaces
        .replace(/[ \t]+/g, " ")
        // Remove multiple consecutive newlines (max 2)
        .replace(/\n{3,}/g, "\n\n")
        // Remove leading/trailing whitespace
        .trim()
    );
  }

  /**
   * Extract the first N sentences from content
   */
  static extractSentences(content: string, count: number = 3): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, count).join(" ").trim();
  }

  /**
   * Remove URLs from content
   */
  static removeUrls(content: string): string {
    return content.replace(/https?:\/\/[^\s]+/g, "").trim();
  }

  /**
   * Count words in text
   */
  static wordCount(text: string): number {
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Validate tweet length (considering URL shortening on Twitter)
   */
  static validateTweetLength(text: string, maxLength: number = 280): boolean {
    // Twitter shortens URLs to 23 characters (t.co links)
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern) || [];

    let effectiveLength = text.length;
    urls.forEach((url) => {
      effectiveLength = effectiveLength - url.length + 23;
    });

    return effectiveLength <= maxLength;
  }

  /**
   * Format article data into a standardized structure for AI
   */
  static formatForAI(title: string, content: string): string {
    const cleanedContent = ContentProcessor.cleanText(content);
    const truncatedContent = ContentProcessor.truncateContent(cleanedContent);

    return `Title: ${title}\n\nContent: ${truncatedContent}`;
  }
}
