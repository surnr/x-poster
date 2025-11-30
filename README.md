# X-Poster: Automated AI-Powered Tweet Generator

An intelligent, modular Cloudflare Workers application that automatically generates and posts engaging tweets from real-time news sources using AI. Built with a plugin-based architecture that makes adding new data sources trivial.

X-Poster solves a critical challenge: **LLMs are not real-time aware**. While models like GPT-5.1 have knowledge cutoffs, X-Poster bridges this gap by:

1. **Live Context Engineering** — Scrapes fresh content from real-time news sources (HackerNews, TechCrunch, Yahoo Finance).
2. **Dynamic Prompt Construction** — Injects the most recent article content directly into AI prompts.
3. **Source-Specific Personas** — Applies tailored AI instructions per source to match voice and context.
4. **Automatic Posting** — Produces human-like tweets and posts them to Twitter/X every 4 hours.

This approach guarantees your tweets reflect **current events** and **breaking news**, not outdated model training data.

## Workflow Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (Edge)                         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Cron Trigger (Every 4h)                   │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Rotation Service (rotation.ts)                  │   │
│  │   Selects data source: Math.floor(hour/4) % sources.length   │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│         ┌─────────────┼─────────────┐                               │
│         │             │             │                               │
│         ▼             ▼             ▼                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                           │
│  │HackerNews│  │TechCrunch│  │  Yahoo   │  (Plugin Architecture)    │
│  │  .ts     │  │  .ts     │  │Finance.ts│                           │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                           │
│        │             │             │                                │
│        └─────────────┼─────────────┘                                │
│                      │                                              │
│                      ▼                                              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 HTML Parser (html-parser.ts)                 │   │
│  │  Extracts: Title, Content, Links using CSS selectors         │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           Content Processor (content-processor.ts)           │   │
│  │  Cleans, truncates (30k chars), validates content            │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
│                       ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │            AI Gateway Service (ai-gateway.ts)                │   │
│  │  Constructs: System Prompt + User Message (article content)  │   │
│  └────────────────────┬─────────────────────────────────────────┘   │
│                       │                                             │
└───────────────────────┼─────────────────────────────────────────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │ Cloudflare AI Gateway│
              │    (Rate Limiting,   │
              │   Caching, Analytics)│
              └──────────┬───────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   OpenAI API    │
                │   (GPT-4 Turbo) │
                └────────┬────────┘
                         │
                         ▼
                ┌──────────────────┐
                │  Generated Tweet │
                │  (255-280 chars) │
                └────────┬─────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Twitter Client      │
              │ (twitter.ts)        │
              │ OAuth 1.0a Auth     │
              └──────────┬──────────┘
                         │
                         ▼
                  ┌─────────────┐
                  │ Twitter/X   │
                  │   API v2    │
                  └─────────────┘
```

## Context Engineering Strategy

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

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Twitter Developer account
- OpenAI API key

### Local Setup & Testing

#### 1. Clone the Repository

```bash
git clone https://github.com/surnr/x-poster.git
cd x-poster
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Local .env

Copy the example env file and update values locally:

```bash
cp .env.example .env
# Open .env and fill in your credentials:
# - OPENAI_API_KEY
# - AI_GATEWAY_ACCOUNT_ID
# - AI_GATEWAY_NAME
# - TWITTER_API_KEY
# - TWITTER_API_SECRET
# - TWITTER_ACCESS_TOKEN
# - TWITTER_ACCESS_SECRET
```

#### 4. Start Local Development Server

```bash
npm run dev
```

The worker will start at `http://localhost:8787`

### Testing the Workflow

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
├── DATASOURCE_EXAMPLES.md  # Examples for new sources
└── README.md
```

## Adding New Data Sources

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

## Deployment

```bash
npm run deploy
```

Your worker will be live at `https://x-poster.your-subdomain.workers.dev`

The cron job runs automatically every 4 hours.

---

**Made with ❤️ for the real-time AI community**
