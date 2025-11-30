import type { Env, AIPrompt } from "./types";
import { rotationService, AIGatewayService, TwitterClient } from "./services";

/**
 * Main Cloudflare Worker
 * Handles scheduled tweet generation and posting
 */
export default {
  /**
   * HTTP handler for manual triggers and status checks
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Status endpoint
    if (url.pathname === "/status") {
      const currentSource = rotationService.getCurrentSource();
      const nextSource = rotationService.getNextSource();
      const timeUntilNext = rotationService.getTimeUntilNextRotation();

      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        currentSource: currentSource.getName(),
        nextSource: nextSource.getName(),
        timeUntilNextRotation: `${Math.floor(
          timeUntilNext / 1000 / 60
        )} minutes`,
        totalSources: rotationService.getSourceCount(),
      });
    }

    // Schedule endpoint
    if (url.pathname === "/schedule") {
      const schedule = rotationService.getSchedule();
      return Response.json({
        schedule: schedule.map((s) => ({
          time: s.time.toISOString(),
          source: s.source,
        })),
      });
    }

    // Manual trigger endpoint (for testing)
    if (url.pathname === "/trigger") {
      ctx.waitUntil(processScheduledTweet(env));
      return Response.json({
        message: "Tweet generation triggered",
        timestamp: new Date().toISOString(),
      });
    }

    // Root endpoint
    return Response.json({
      name: "X-Poster",
      version: "1.0.0",
      endpoints: {
        "/status": "Current rotation status",
        "/schedule": "Upcoming tweet schedule",
        "/trigger": "Manual trigger (for testing)",
      },
    });
  },

  /**
   * Scheduled event handler (runs every 4 hours)
   */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(
      "Scheduled tweet generation started at:",
      new Date().toISOString()
    );
    ctx.waitUntil(processScheduledTweet(env));
  },
};

/**
 * Main workflow: Scrape → Generate → Post
 */
async function processScheduledTweet(env: Env): Promise<void> {
  const startTime = Date.now();

  try {
    // Step 1: Get current data source based on rotation
    const dataSource = rotationService.getCurrentSource();
    console.log(`Selected data source: ${dataSource.getName()}`);

    // Step 2: Fetch listing page
    console.log(`Fetching listing from: ${dataSource.getListingUrl()}`);
    const listingResponse = await fetch(dataSource.getListingUrl(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!listingResponse.ok) {
      throw new Error(`Failed to fetch listing: ${listingResponse.statusText}`);
    }

    const listingHtml = await listingResponse.text();

    // Step 3: Extract article links
    const articleLinks = await dataSource.scrapeArticleLinks(listingHtml);

    if (articleLinks.length === 0) {
      throw new Error("No articles found on listing page");
    }

    console.log(`Found ${articleLinks.length} articles, selecting first one`);

    // Step 4: Fetch and parse the first article
    const articleUrl = articleLinks[0];
    console.log(`Fetching article: ${articleUrl}`);

    const article = await dataSource.fetchArticleContent(articleUrl);
    console.log(`Article fetched: "${article.title.substring(0, 60)}..."`);

    // Step 5: Prepare AI prompt
    const prompt: AIPrompt = {
      systemPrompt: dataSource.getSystemPrompt(),
      userMessage: dataSource.getUserMessage(article),
      characterLimit: dataSource.getCharacterLimit(),
    };

    // Step 6: Generate tweet using AI Gateway
    console.log("Generating tweet with AI...");
    const aiService = new AIGatewayService(env);
    const tweetText = await aiService.generateTweet(prompt);

    console.log(`Generated tweet (${tweetText.length} chars): ${tweetText}`);

    // Step 7: Post to Twitter
    console.log("Posting to Twitter...");
    const twitterClient = new TwitterClient(env);
    const tweetId = await twitterClient.postTweet(tweetText);

    console.log(`Tweet posted successfully! ID: ${tweetId}`);

    // Step 8: Log success
    const duration = Date.now() - startTime;
    console.log(`Workflow completed successfully in ${duration}ms`);
    console.log("---");
  } catch (error) {
    console.error("Error in scheduled tweet workflow:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Optionally: Send error notification
    // You could integrate with Discord, Slack, or email here

    throw error; // Re-throw to mark the worker execution as failed
  }
}
