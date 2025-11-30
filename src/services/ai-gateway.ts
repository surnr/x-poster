import type { Env, AIPrompt } from "../types";

/**
 * AI Gateway Service
 * Handles OpenAI API calls through Cloudflare AI Gateway
 * Provides retry logic and error handling
 */
export class AIGatewayService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Generate a tweet using OpenAI through Cloudflare AI Gateway
   * @param prompt - The AI prompt with system and user messages
   * @returns Generated tweet text
   */
  async generateTweet(prompt: AIPrompt): Promise<string> {
    const model = this.env.OPENAI_MODEL || "gpt-4-turbo";

    // Construct Cloudflare AI Gateway URL
    // Format: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai/chat/completions
    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${this.env.AI_GATEWAY_ACCOUNT_ID}/${this.env.AI_GATEWAY_NAME}/openai/chat/completions`;

    const requestBody = {
      model,
      messages: [
        {
          role: "system",
          content: prompt.systemPrompt,
        },
        {
          role: "user",
          content: prompt.userMessage,
        },
      ],
      temperature: 0.8, // Balanced creativity
      max_tokens: 150, // Enough for a tweet
      top_p: 0.9,
    };

    // Try with retries
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `OpenAI API error (${response.status}): ${errorText}`
          );
        }

        const data: {
          choices: Array<{
            message: {
              content: string;
            };
          }>;
        } = await response.json();

        const tweet = data.choices[0]?.message?.content?.trim();

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
