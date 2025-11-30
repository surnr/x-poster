import type { Env } from "../types";
import { ContentProcessor } from "../utils";

/**
 * Twitter API Client
 * Handles authentication and posting tweets via Twitter API v2
 */
export class TwitterClient {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Post a tweet to Twitter/X
   * @param text - The tweet text to post
   * @returns Tweet ID if successful
   */
  async postTweet(text: string): Promise<string> {
    // Validate tweet before posting
    if (!text || text.trim().length === 0) {
      throw new Error("Tweet text cannot be empty");
    }

    if (!ContentProcessor.validateTweetLength(text)) {
      throw new Error(
        `Tweet exceeds maximum length: ${text.length} characters`
      );
    }

    // Twitter API v2 endpoint
    const url = "https://api.twitter.com/2/tweets";

    // Prepare request body
    const requestBody = {
      text: text.trim(),
    };

    try {
      // Get OAuth 1.0a signature
      const authHeader = await this.generateOAuthHeader(
        "POST",
        url,
        requestBody
      );

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Twitter API error (${response.status}): ${errorData}`);
      }

      const data: {
        data: {
          id: string;
          text: string;
        };
      } = await response.json();

      console.log("Tweet posted successfully:", {
        id: data.data.id,
        text: data.data.text,
      });

      return data.data.id;
    } catch (error) {
      console.error("Failed to post tweet:", error);
      throw error;
    }
  }

  /**
   * Generate OAuth 1.0a authorization header
   * Twitter API v2 requires OAuth 1.0a for tweet posting
   */
  private async generateOAuthHeader(
    method: string,
    url: string,
    body?: unknown
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = this.generateNonce();

    // OAuth parameters
    const oauthParams = {
      oauth_consumer_key: this.env.TWITTER_API_KEY,
      oauth_token: this.env.TWITTER_ACCESS_TOKEN,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: "1.0",
    };

    // Generate signature
    const signature = await this.generateSignature(method, url, oauthParams);

    // Build authorization header
    const authParams = {
      ...oauthParams,
      oauth_signature: signature,
    };

    const authHeader =
      "OAuth " +
      Object.entries(authParams)
        .map(([key, value]) => `${key}="${this.percentEncode(value)}"`)
        .join(", ");

    return authHeader;
  }

  /**
   * Generate OAuth signature using HMAC-SHA1
   */
  private async generateSignature(
    method: string,
    url: string,
    params: Record<string, string>
  ): Promise<string> {
    // Create signature base string
    const sortedParams = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, value]) =>
          `${this.percentEncode(key)}=${this.percentEncode(value)}`
      )
      .join("&");

    const signatureBaseString = [
      method.toUpperCase(),
      this.percentEncode(url),
      this.percentEncode(sortedParams),
    ].join("&");

    // Create signing key
    const signingKey = [
      this.percentEncode(this.env.TWITTER_API_SECRET),
      this.percentEncode(this.env.TWITTER_ACCESS_SECRET),
    ].join("&");

    // Generate HMAC-SHA1 signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingKey);
    const messageData = encoder.encode(signatureBaseString);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);

    // Convert to base64
    return this.arrayBufferToBase64(signature);
  }

  /**
   * Generate a random nonce for OAuth
   */
  private generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Percent encode for OAuth (RFC 3986)
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Test Twitter API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Verify credentials by getting user info
      const url = "https://api.twitter.com/2/users/me";
      const authHeader = await this.generateOAuthHeader("GET", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Twitter API connection test failed:", error);
      return false;
    }
  }
}
