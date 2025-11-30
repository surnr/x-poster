/**
 * Cloudflare Worker environment bindings and secrets
 */
export interface Env {
  // OpenAI Configuration
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string; // Default: gpt-4-turbo

  // Cloudflare AI Gateway Configuration
  AI_GATEWAY_ACCOUNT_ID: string;
  AI_GATEWAY_NAME: string;

  // Twitter/X API Credentials (OAuth 2.0)
  TWITTER_API_KEY: string;
  TWITTER_API_SECRET: string;
  TWITTER_ACCESS_TOKEN: string;
  TWITTER_ACCESS_SECRET: string;
  TWITTER_BEARER_TOKEN?: string;
}
