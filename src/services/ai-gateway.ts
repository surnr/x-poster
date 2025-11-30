import OpenAI from "openai";
import type { Env, AIPrompt } from "../types";

/**
 * AI Gateway Service
 * Handles OpenAI API calls through Cloudflare AI Gateway
 * Provides retry logic and error handling
 */
export class AIGatewayService {
  private readonly env: Env;
  private readonly client: OpenAI;

  constructor(env: Env) {
    this.env = env;

    // Initialize OpenAI client with Cloudflare AI Gateway proxy
    const baseURL = `https://gateway.ai.cloudflare.com/v1/${env.AI_GATEWAY_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/openai`;

    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL,
    });
  }

  /**
   * Generate a tweet using OpenAI Responses API through Cloudflare AI Gateway
   * @param prompt - The AI prompt with system and user messages
   * @returns Generated tweet text
   */
  async generateTweet(prompt: AIPrompt): Promise<string> {
    const model = this.env.OPENAI_MODEL || "gpt-5.1";

    // Try with retries
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.responses.create({
          model,
          instructions: prompt.systemPrompt,
          input: prompt.userMessage,
          temperature: 0.8, // Balanced creativity
        });

        const tweet = response.output_text?.trim();

        if (!tweet) {
          throw new Error("Empty response from OpenAI");
        }

        // Validate tweet length
        if (tweet.length > prompt.characterLimit) {
          console.warn(
            `Generated tweet exceeds character limit (${tweet.length} > ${prompt.characterLimit}). Truncating...`
          );
          // Try to truncate at sentence boundary
          const sentences = tweet.split(/[.!?]+/);
          let truncated = "";
          for (const sentence of sentences) {
            if ((truncated + sentence).length <= prompt.characterLimit - 3) {
              truncated += sentence + ".";
            } else {
              break;
            }
          }
          return (
            truncated.trim() ||
            tweet.substring(0, prompt.characterLimit - 3) + "..."
          );
        }

        return tweet;
      } catch (error) {
        lastError = error as Error;
        console.error(
          `AI Gateway attempt ${attempt}/${maxRetries} failed:`,
          error
        );

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw new Error(
      `Failed to generate tweet after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Test the AI Gateway connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPrompt: AIPrompt = {
        systemPrompt: "You are a helpful assistant.",
        userMessage: 'Say "test successful" in 2 words.',
        characterLimit: 280,
      };

      const response = await this.generateTweet(testPrompt);
      return response.length > 0;
    } catch (error) {
      console.error("AI Gateway connection test failed:", error);
      return false;
    }
  }

  /**
   * Helper function to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
