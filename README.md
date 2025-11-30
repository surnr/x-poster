# X-Poster: Automated AI-Powered Tweet Generator

An intelligent, modular Cloudflare Workers application that automatically generates and posts engaging tweets from real-time news sources using AI. Built with a plugin-based architecture that makes adding new data sources trivial.

## 🎯 What is X-Poster?

X-Poster solves a critical challenge: **LLMs are not real-time aware**. While models like GPT-4 have knowledge cutoffs, X-Poster bridges this gap by:

1. **Live Context Engineering**: Scrapes real-time content from news sources (HackerNews, TechCrunch, Yahoo Finance)
2. **Dynamic Prompt Construction**: Feeds fresh article content directly into AI prompts
3. **Source-Specific Personas**: Each data source has custom AI instructions to match the content type
4. **Automatic Posting**: Generates human-like tweets and posts them to Twitter/X every 4 hours

This approach ensures your tweets are always about **current events** and **breaking news**, not outdated information from LLM training data.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (Edge)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    Cron Trigger (Every 4h)                   │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Rotation Service (rotation.ts)                  │ │
│  │   Selects data source: Math.floor(hour/4) % sources.length  │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
│         ┌─────────────┼─────────────┐                              │
│         │             │             │                              │
│         ▼             ▼             ▼                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │HackerNews│  │TechCrunch│  │  Yahoo   │  (Plugin Architecture) │
│  │  .ts     │  │  .ts     │  │Finance.ts│                        │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                        │
│        │             │             │                              │
│        └─────────────┼─────────────┘                              │
│                      │                                             │
│                      ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                 HTML Parser (html-parser.ts)                 │ │
│  │  Extracts: Title, Content, Links using CSS selectors        │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │           Content Processor (content-processor.ts)           │ │
│  │  Cleans, truncates (30k chars), validates content           │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │            AI Gateway Service (ai-gateway.ts)                │ │
│  │  Constructs: System Prompt + User Message (article content) │ │
│  └────────────────────┬─────────────────────────────────────────┘ │
│                       │                                             │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ Cloudflare AI Gateway│
              │    (Rate Limiting,   │
              │   Caching, Analytics)│
              └──────────┬───────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   OpenAI API    │
                │   (GPT-4 Turbo) │
                └────────┬─────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Generated Tweet │
                │  (255-280 chars) │
                └────────┬─────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Twitter Client      │
              │ (twitter.ts)        │
              │ OAuth 1.0a Auth     │
              └──────────┬───────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Twitter/X   │
                  │   API v2    │
                  └─────────────┘
```

## 🧠 Context Engineering Strategy

### The Problem

LLMs are trained on data with a cutoff date. They can't know about:

- Breaking news from today
- Trending GitHub repos this week
- Latest crypto market movements
- New AI breakthroughs announced yesterday

### Our Solution: Real-Time Context Injection

```typescript
// Traditional approach (outdated):
"Write a tweet about AI news" → LLM → Tweet (based on old training data)

// X-Poster approach (real-time):
1. Scrape TechCrunch AI category (right now)
2. Extract latest article: "OpenAI releases GPT-5 with video understanding"
3. Build prompt: "Title: GPT-5 Released\nContent: [full article text]"
4. Send to LLM → Gets tweet about TODAY's news
```

### How Each Data Source Works

**HackerNews** (`hackernews.ts`)

```
1. Fetch: https://news.ycombinator.com/news
2. Extract: First trending article link (.titleline a)
3. Scrape: Full article content
4. Context: "You're a tech-savvy developer sharing HN finds..."
5. Result: Tweet about latest trending tech discussion
```

**TechCrunch** (`techcrunch.ts`)

```
1. Fetch: https://techcrunch.com/category/artificial-intelligence/
2. Extract: Latest AI news article (.loop-card__title-link)
3. Scrape: Article title + body (.entry-content)
4. Context: "You're a news-savvy enthusiast sharing AI breakthroughs..."
5. Result: Tweet about breaking AI/startup news
```

**Yahoo Finance** (`yahoo-finance.ts`)

```
1. Fetch: https://finance.yahoo.com/topic/crypto/
2. Extract: Latest crypto news (.titles)
3. Scrape: Article title + content (.cover-title, .body)
4. Context: "You're a Web3 founder who trades crypto..."
5. Result: Tweet about current crypto market events
```

### Prompt Engineering Pattern

Each data source uses this structure:

```typescript
{
  systemPrompt: `
    Persona definition (who you are)
    Platform understanding (X/Twitter algorithm)
    Content guidelines (tone, length, style)
    Output format (just the tweet, no fluff)
  `,
  userMessage: `
    Title: [Real-time article title]
    Content: [First 30,000 chars of article]

    Task: Extract key insight and write tweet
    Link: [source URL]
  `
}
```

The LLM sees **fresh content** every time, ensuring tweets are always about **current events**.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Twitter Developer account
- OpenAI API key

### Local Setup & Testing

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/x-poster.git
cd x-poster
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Secrets (for deployment)

```bash
# OpenAI & AI Gateway
wrangler secret put OPENAI_API_KEY
wrangler secret put AI_GATEWAY_ACCOUNT_ID
wrangler secret put AI_GATEWAY_NAME

# Twitter API Credentials
wrangler secret put TWITTER_API_KEY
wrangler secret put TWITTER_API_SECRET
wrangler secret put TWITTER_ACCESS_TOKEN
wrangler secret put TWITTER_ACCESS_SECRET
```

#### 4. Start Local Development Server

```bash
npm run dev
```

The worker will start at `http://localhost:8787`

### 🧪 Testing the Workflow

#### Test Endpoints

**Check Status**

```bash
curl http://localhost:8787/status
```

Returns current rotation status, next source, and countdown.

**View Schedule**

```bash
curl http://localhost:8787/schedule
```

See upcoming tweet schedule for next 24 hours.

**Manual Trigger (HTTP)**

```bash
curl http://localhost:8787/trigger
```

Manually runs the full workflow without waiting for cron.

#### **Test Scheduled Workflow Locally** ⚡

To test the actual cron job logic locally:

```bash
curl http://localhost:8787/__scheduled?cron=*+*+*+*+*
```

Or use the Cloudflare-specific handler URL:

```bash
curl "http://localhost:8787/cdn-cgi/mf/scheduled"
```

This simulates the scheduled trigger and runs the complete workflow:

1. Selects data source based on current time
2. Scrapes listing page
3. Extracts article content
4. Generates tweet with AI
5. Posts to Twitter (if credentials configured)

**Watch the logs** in your terminal to see the full execution flow!

### 📁 Project Structure

```
x-poster/
├── src/
│   ├── types/              # TypeScript type definitions
│   │   ├── datasource.ts   # DataSource interface (plugin contract)
│   │   ├── env.ts          # Environment bindings
│   │   └── index.ts
│   ├── utils/              # Shared utilities
│   │   ├── html-parser.ts  # CSS selector-based extraction
│   │   ├── content-processor.ts  # Text cleaning & truncation
│   │   └── index.ts
│   ├── datasources/        # Pluggable data sources
│   │   ├── hackernews.ts   # HackerNews scraper
│   │   ├── techcrunch.ts   # TechCrunch scraper
│   │   ├── yahoo-finance.ts  # Yahoo Finance scraper
│   │   ├── _template.ts    # Template for new sources
│   │   └── index.ts
│   ├── services/           # Core business logic
│   │   ├── rotation.ts     # Time-based source selection
│   │   ├── ai-gateway.ts   # OpenAI integration
│   │   ├── twitter.ts      # Twitter API client
│   │   └── index.ts
│   ├── config/             # Configuration
│   │   └── datasources.ts  # Source registry (add sources here)
│   └── index.ts            # Main worker entry point
├── wrangler.jsonc          # Cloudflare Workers config
├── package.json
├── tsconfig.json
├── QUICKSTART.md           # 5-minute setup guide
├── DATASOURCE_EXAMPLES.md  # Examples for new sources
└── README.md
```

## 🔌 Adding New Data Sources

The plugin architecture makes adding sources incredibly easy:

### 1. Create Source File

```bash
cp src/datasources/_template.ts src/datasources/reddit.ts
```

### 2. Implement Interface

```typescript
export class Reddit implements DataSource {
  getName(): string {
    return "Reddit";
  }

  getListingUrl(): string {
    return "https://www.reddit.com/r/technology/hot.json";
  }

  async scrapeArticleLinks(html: string): Promise<string[]> {
    const data = JSON.parse(html);
    return data.data.children.map((post) => post.data.url);
  }

  async fetchArticleContent(url: string): Promise<ScrapedArticle> {
    // Fetch and extract content
  }

  getSystemPrompt(): string {
    return "You discover cool Reddit posts...";
  }

  getUserMessage(article: ScrapedArticle): string {
    return `Title: ${article.title}\n\nContent: ${article.content}`;
  }

  getCharacterLimit(): number {
    return 280;
  }
}
```

### 3. Register Source

Edit `src/config/datasources.ts`:

```typescript
export const DATA_SOURCES: DataSource[] = [
  new HackerNews(),
  new TechCrunch(),
  new YahooFinance(),
  new Reddit(), // ← Add here
];
```

That's it! Your new source is now in the rotation.

See `DATASOURCE_EXAMPLES.md` for complete examples (Reddit, Product Hunt, Dev.to, Medium, GitHub).

## 🔄 How Rotation Works

**Formula**: `Math.floor(currentHour / 4) % numberOfSources`

With 3 sources and 4-hour intervals:

```
00:00-03:59 → HackerNews
04:00-07:59 → TechCrunch
08:00-11:59 → Yahoo Finance
12:00-15:59 → HackerNews
16:00-19:59 → TechCrunch
20:00-23:59 → Yahoo Finance
```

Add more sources and rotation automatically adjusts:

- 4 sources = changes every 6 hours
- 6 sources = changes every 4 hours
- 8 sources = changes every 3 hours

## 🎨 Key Features

- ✅ **Real-time Context Engineering**: Fresh content injected into AI prompts
- ✅ **Plugin Architecture**: Add sources without touching core code
- ✅ **Modular Services**: Rotation, scraping, AI, Twitter all decoupled
- ✅ **Type-Safe**: Full TypeScript with strict types
- ✅ **Edge Performance**: Runs on Cloudflare's global network (<100ms)
- ✅ **Built-in Monitoring**: Status, schedule, and trigger endpoints
- ✅ **Retry Logic**: Automatic retries for AI and network failures
- ✅ **Cost-Effective**: Runs on Cloudflare free tier

## 📊 Monitoring & Observability

**Status Endpoint**

```bash
curl https://your-worker.workers.dev/status
```

Returns: Current source, next source, time until rotation, total sources

**Schedule Endpoint**

```bash
curl https://your-worker.workers.dev/schedule
```

Returns: Next 24 hours of scheduled tweets with timestamps

**Production Logs**

```bash
wrangler tail
```

Real-time streaming logs from production worker

## 🚀 Deployment

```bash
npm run deploy
```

Your worker will be live at `https://x-poster.your-subdomain.workers.dev`

The cron job runs automatically every 4 hours.

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Complete setup guide (5 minutes)
- **[DATASOURCE_EXAMPLES.md](DATASOURCE_EXAMPLES.md)** - Ready-to-use source implementations
- **[SUMMARY.md](SUMMARY.md)** - Project architecture overview
- **[.env.example](.env.example)** - Environment variables guide

## 🛠️ Development

**Type Check**

```bash
npm run check
```

**Generate Types**

```bash
npm run cf-typegen
```

**Local Dev**

```bash
npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a new data source or improve existing ones
3. Ensure TypeScript compiles: `npm run check`
4. Test locally: `npm run dev`
5. Submit a pull request

## 📄 License

MIT

## 🙏 Credits

Built with:

- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge computing platform
- [OpenAI](https://openai.com/) - AI text generation
- [Cheerio](https://cheerio.js.org/) - HTML parsing
- [Twitter API v2](https://developer.twitter.com/) - Tweet posting

---

**Made with ❤️ for the real-time AI community**
