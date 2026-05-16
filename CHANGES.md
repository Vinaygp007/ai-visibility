# Marcstrat Tool — Full Change Log

All changes made during the current development session, documented by file and feature.

---

## 1. New AI Providers Added to Settings

**File:** `app/settings/page.tsx`

Three new AI providers added to both `PROVIDER_MODELS` and `DEFAULT_SETTINGS.providers`:

| Provider | ID | Default Model | API Key Needed |
|---|---|---|---|
| You.com | `youcom` | `smart` | You.com Developer API key |
| DuckDuckGo AI | `duckduckgo` | `ddg-default` | None (no public API — shows error if enabled) |
| Meta AI (Llama) | `meta` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | Together AI API key |

**Model options added:**
- **You.com:** Smart, Research
- **DuckDuckGo AI:** DuckDuckGo AI Chat (display only)
- **Meta AI:** Llama 3.3 70B, Llama 3.1 70B, Llama 3.1 8B

---

## 2. New Backend Provider Functions

**File:** `app/api/analyze/route.ts`

| Function | Endpoint | Notes |
|---|---|---|
| `callYouCom()` | `https://api.you.com/{model}` | `X-API-Key` header auth |
| `callDuckDuckGoAI()` | — | Throws informative error (no public API exists) |
| `callMetaAI()` | `https://api.together.xyz/v1/chat/completions` | OpenAI-compatible, Llama models |

All three added to `providerFunctions` map in `runAllProviders()`.

**Env vars required:**
```
YOUCOM_API_KEY=your_youcom_key
META_AI_API_KEY=your_together_ai_key
```

---

## 3. AI Citation Potential — Fixed (was always "warn")

**File:** `app/api/analyze/route.ts` → `computeScores()` → Category 4

**Before:** Hardcoded `status: "warn"`, static string regardless of site data.

**After:** Evaluates 5 real signals from fetched data:

| Signal | Source |
|---|---|
| JSON-LD | Parsed from homepage HTML |
| Meta description | Parsed from homepage HTML |
| Schema.org | Parsed from homepage HTML |
| llms.txt | Fetched from `/llms.txt` |
| XML Sitemap | Fetched from `/sitemap.xml` |

**Scoring:**
- 4–5 signals → `pass` — "Strong signals (4/5): JSON-LD, meta description, Schema.org, sitemap"
- 2–3 signals → `warn` — "Moderate signals (2/5) — add JSON-LD and meta description"
- 0–1 signals → `fail` — "Weak signals (0/5) — missing meta description, JSON-LD, and structured data"

---

## 4. AI Indexing Readiness — New Dedicated Check

**File:** `app/api/analyze/route.ts` → `computeScores()` → Category 5

New check added to "Technical AI SEO" category that aggregates 5 signals:

1. HTTPS enabled
2. XML sitemap found
3. Canonical URL present
4. `lang` attribute on `<html>`
5. Majority of AI bots not blocked (less than 7 of 14 blocked)

**Scoring:**
- 5/5 → `pass` — "Fully ready: HTTPS, sitemap, canonical, language, and AI bots accessible"
- 3–4/5 → `warn` — "Partially ready (4/5): missing canonical, bot access"
- 0–2/5 → `fail` — "Not ready (X/5) — site may not be properly indexed by AI systems"

---

## 5. Enhanced `checkBot()` — Directive Capture & Block Type

**File:** `app/api/analyze/route.ts`

**Before:** Returned `{ allowed: boolean; reason: string }`

**After:** Returns `{ allowed: boolean; reason: string; directive: string | null; blockType: BlockType }`

| BlockType | Meaning |
|---|---|
| `explicit_allow` | Bot has its own `Allow: /` rule |
| `explicit_block` | Bot has its own `Disallow: /` rule |
| `global_block` | Blocked by `User-agent: *` wildcard |
| `not_mentioned` | Not found in robots.txt, allowed by default |
| `no_robots` | robots.txt doesn't exist |

- Preserves **original casing** of the robots.txt line so the actual directive (`Disallow: /`) can be displayed in the UI.
- Old parser lowercased everything and lost the original line.

---

## 6. Smarter AI Recommendations — Blocked Platforms in Prompt

**File:** `app/api/analyze/route.ts` → `buildPrompt()`

Added to the facts string sent to every AI provider:

```
BLOCKED AI PLATFORMS: Claude (direct Disallow:/), PerplexityBot (via User-agent:* wildcard)
```

This causes the AI to generate platform-specific recommendations like:
> "Add `User-agent: ClaudeBot / Allow: /` to robots.txt"

instead of generic advice.

---

## 7. `_botResults` Field in API Response

**File:** `app/api/analyze/route.ts` → POST handler

All 14 AI bot check results are now exported in the API response under `_botResults`:

```typescript
_botResults: [{
  key: "ClaudeBot",
  label: "Claude",
  company: "Anthropic",
  allowed: false,
  reason: "ClaudeBot blocked in robots.txt",
  directive: "Disallow: /",        // actual robots.txt line
  blockType: "explicit_block"
}, ...]
```

Cached alongside the rest of the scan result.

---

## 8. Enhanced AI Platform Coverage UI

**File:** `components/ResultsSection.tsx`

Completely replaced the old 2×4 grid with a rich two-section layout:

### Accessible section
- Compact chip per bot
- Dot colored by company (`COMPANY_COLORS` constant added)
- Tooltip shows reason

### Blocked section
- Expanded card per blocked bot
- Company-colored dot
- Badge: **wildcard block** (amber) vs **explicit block** (red)
- Dark monospace box showing the actual robots.txt directive
- `fix →` inline hint with exact robots.txt change needed

### Progress bar
- Full-width bar colored green / amber / red based on % accessible

### Company colors added:
| Company | Color |
|---|---|
| OpenAI | `#10a37f` |
| Anthropic | `#c87533` |
| Perplexity | `#20b2aa` |
| Google | `#4285f4` |
| Meta | `#0082fb` |
| You.com | `#ff6b35` |
| DuckDuckGo | `#de5833` |
| Apple | `#888` |
| Cohere | `#4db69e` |
| ByteDance | `#ff0050` |
| CommonCrawl | `#9b9b9b` |
| Amazon | `#ff9900` |

---

## 9. New API Route — `/api/crawl`

**File:** `app/api/crawl/route.ts`

BFS site crawler. Accepts `POST { url, maxPages? }`.

### Crawl behavior
- Max **20 pages**, **5 concurrent** fetches, **5s timeout** per page
- Fetches robots.txt and sitemap.xml in parallel before crawl starts
- BFS from homepage, follows internal links, skips non-HTML file extensions
- Tracks BFS **link depth** and **inbound link count** per page

### Per-page analysis (`CrawlPage`)
| Field | Description |
|---|---|
| `url` | Full URL |
| `status` | HTTP status code |
| `responseTimeMs` | Response time |
| `wordCount` | Words (excluding scripts/styles) |
| `h1Text` | First H1 text |
| `h1Count` | Number of H1 tags |
| `h2Count` | Number of H2 tags |
| `textRatioPercent` | Text-to-HTML ratio % |
| `metaTitle` | Page title text |
| `metaTitleLength` | Title character count |
| `metaDescription` | Meta description text |
| `metaDescriptionLength` | Meta description character count |
| `isIndexable` | `true` if no `noindex` directive |
| `hasCanonical` | Canonical tag present |
| `linkDepth` | BFS depth from homepage (0 = homepage) |
| `inboundLinkCount` | Number of crawled pages linking to this page |
| `issues` | Array of detected issue strings |

### Issue types detected (11 total)
`timeout / unreachable`, `server error`, `broken link`, `missing H1`, `multiple H1s`, `no title tag`, `title too long`, `title too short`, `no meta description`, `description too long`, `noindex`, `thin content`, `orphan page`

### Response (`CrawlResult`)
```typescript
{
  baseUrl, pagesCrawled, pagesBroken,
  crawlDurationMs, avgResponseTimeMs,
  totalIssues, statusBreakdown,
  robotsTxtFound, sitemapFound,
  orphanPages,    // string[] — URLs with 0 inbound links
  avgLinkDepth,   // average BFS depth across all crawled pages
  pages           // CrawlPage[]
}
```

---

## 10. New Component — `CrawlSection.tsx`

**File:** `components/CrawlSection.tsx`

Self-contained component placed at the bottom of every scan result. User triggers it independently.

### States
| State | Display |
|---|---|
| `idle` | Explanatory text + "Run Technical Crawl" button |
| `loading` | Animated spinner |
| `done` | Full results |
| `error` | Error message |

### Results display
- **6 stat cards:** Pages Crawled, Broken Pages, Avg Response, Orphan Pages, Total Issues, Avg Link Depth
- **robots.txt + sitemap.xml status pills** (green ✓ / red ✕)
- **Status code breakdown pills:** 2xx / 3xx / 4xx / 5xx / error
- **Orphan pages panel:** lists all pages with 0 inbound links
- **Filter tabs:** All pages / Has issues / Broken only
- **Sortable table** — click any column header:

| Column | Sortable | Notes |
|---|---|---|
| URL | ✓ | Clickable link, shows path relative to base |
| Status | ✓ | Color-coded (green/amber/red) |
| Time | ✓ | ms, color by threshold (>400ms amber, >800ms red) |
| Words | ✓ | Amber if <100 |
| H1 | ✓ | ✓ / ✕ / `Nx` for multiple |
| H2s | ✓ | Count |
| Text% | ✓ | Text-to-HTML ratio |
| Title | ✓ | Length in chars, green 30–60, amber outside |
| Depth | ✓ | BFS depth, amber if >3 |
| Inbound | ✓ | Amber if 0 (orphan) |
| Issues | — | Colored badges, overflow handled with `+N more` |

---

## 11. `safeFetch()` Returns HTTP Headers

**File:** `app/api/analyze/route.ts`

```typescript
// Before
{ text: string; status: number }

// After
{ text: string; status: number; headers: Record<string, string> }
```

Headers are lowercase-normalised. Used to check security response headers from the homepage.

---

## 12. Enhanced `buildTechData()` — New Signal Fields

**File:** `app/api/analyze/route.ts`

New parameter: `responseHeaders: Record<string, string> = {}`

### Security headers (from HTTP response)
| Field | Header checked |
|---|---|
| `hasHSTS` | `Strict-Transport-Security` |
| `hasCSP` | `Content-Security-Policy` |
| `hasXFrame` | `X-Frame-Options` or `frame-ancestors` in CSP |
| `hasXContent` | `X-Content-Type-Options` |
| `hasReferrer` | `Referrer-Policy` |

### Advanced technical SEO (from HTML)
| Field | What it checks |
|---|---|
| `hasHreflang` | `<link rel="alternate" hreflang=...>` |
| `mixedContent` | HTTP resources on an HTTPS page |
| `canonicalConflict` | More than one `<link rel="canonical">` |

### Mobile usability (from HTML)
| Field | What it checks |
|---|---|
| `touchIcon` | `<link rel="apple-touch-icon">` |
| `metaThemeColor` | `<meta name="theme-color">` |
| `viewportProper` | Viewport contains `width=device-width` |

### Content quality & EEAT (from HTML)
| Field | What it checks |
|---|---|
| `homepageWordCount` | Words on homepage (excludes scripts/styles) |
| `avgSentenceWords` | Average words per sentence (readability proxy) |
| `hasAuthorSchema` | `@type: Person` or `Author` in JSON-LD |
| `hasReviewSchema` | `@type: Review` or `AggregateRating` |
| `hasFAQSchema` | `@type: FAQPage` |
| `hasAboutLink` | `/about` link on homepage |
| `hasContactLink` | `/contact` or `mailto:` link |
| `hasPrivacyLink` | `/privacy` or `/terms` link |

---

## 13. Two New Scoring Categories

**File:** `app/api/analyze/route.ts` → `computeScores()`

Overall score now averages **7 categories** (was 5).

### Category 6 — Security & Headers (6 checks)
| Check | Pass condition |
|---|---|
| HSTS | `Strict-Transport-Security` header present |
| Content-Security-Policy | CSP header present |
| Clickjacking protection | `X-Frame-Options` or `frame-ancestors` |
| X-Content-Type-Options | Header present |
| Referrer-Policy | Header present |
| Privacy & terms pages | `/privacy` or `/terms` link found |

### Category 7 — Content Quality & EEAT (6 checks)
| Check | Pass condition |
|---|---|
| Homepage word count | ≥300 words = pass, 100–299 = warn, <100 = fail |
| Readability | Avg sentence ≤20 words = pass, ≤30 = warn, >30 = fail |
| Author/Person schema | `@type: Person` or `Author` in JSON-LD |
| Review or FAQ schema | `@type: Review`, `AggregateRating`, or `FAQPage` |
| About page linked | `/about` href found on homepage |
| Contact accessible | `/contact` or `mailto:` found on homepage |

---

## 14. Enhanced Technical AI SEO Category

**File:** `app/api/analyze/route.ts` → `computeScores()` → Category 5

5 new checks added (was 5 checks, now 10):

| New check | Pass condition |
|---|---|
| Viewport configured correctly | `width=device-width` in viewport content |
| Apple touch icon | `<link rel="apple-touch-icon">` present |
| No canonical conflict | Only one `<link rel="canonical">` |
| Hreflang / international | `hreflang` attribute found |
| No mixed content | No `http://` resources on HTTPS page |

---

## 15. Keyword Intelligence — Extraction & Display

**File:** `app/api/analyze/route.ts` → `extractKeywords()` + POST handler  
**File:** `components/ResultsSection.tsx` — Keyword Intelligence panel

### Extraction logic
- Strips scripts, styles, all HTML tags
- Lowercases, removes punctuation
- Filters words shorter than 4 chars and a 100+ word stop-list
- Counts frequency
- Returns top 15 sorted by count

### Per keyword
```typescript
{ word: string; count: number; inTitle: boolean; inH1: boolean; inMeta: boolean }
```

### UI
- Keyword chips with frequency count
- Color badges: **T** (in title) · **H1** (in H1) · **M** (in meta description)
- Hover tooltip shows full breakdown

### API response field
```typescript
keywords: { word, count, inTitle, inH1, inMeta }[]
```

---

## 16. New API Route — `/api/pagespeed`

**File:** `app/api/pagespeed/route.ts`

Calls **Google PageSpeed Insights API** for mobile + desktop in parallel.

### Request
```typescript
POST /api/pagespeed
{ url: string }
```

### Response
```typescript
{ mobile: SpeedResult; desktop: SpeedResult }
```

### SpeedResult
```typescript
{
  strategy: "mobile" | "desktop";
  performanceScore: number | null;   // 0–100
  metrics: {
    lcp:  { displayValue, score, numericValue };  // Largest Contentful Paint
    cls:  { displayValue, score, numericValue };  // Cumulative Layout Shift
    inp:  { displayValue, score, numericValue };  // Interaction to Next Paint
    fcp:  { displayValue, score, numericValue };  // First Contentful Paint
    ttfb: { displayValue, score, numericValue };  // Time to First Byte
    tbt:  { displayValue, score, numericValue };  // Total Blocking Time
  };
  opportunities: { title, description, savingsMs? }[];  // up to 5
  diagnostics: string[];                                 // up to 6 failed checks
  fetchTime: string;
  error?: string;
}
```

### Env var (optional)
```
PAGESPEED_API_KEY=your_google_api_key
```
Without a key the API works but has lower rate limits (Google allows ~1–2 req/s without key).

---

## 17. New Component — `SpeedSection.tsx`

**File:** `components/SpeedSection.tsx`

Self-contained, user-triggered (same pattern as CrawlSection).

### States
| State | Display |
|---|---|
| `idle` | Explanation + "Run Speed Test" button |
| `loading` | Spinner, "Running Lighthouse audit…" |
| `done` | Full results |
| `error` | Error + hint to add `PAGESPEED_API_KEY` |

### Results display
- Side-by-side **mobile + desktop panels**
- SVG circular gauge showing performance score (0–100), color-coded green/amber/red
- **Core Web Vitals table:** LCP, CLS, INP — with good/poor thresholds shown
- **Speed metrics table:** FCP, TTFB, TBT
- **Opportunities panel** (amber) — what to fix and estimated savings in ms
- **Failed checks panel** (red) — other Lighthouse failures as badges

---

## 18. Updated Types (`types/index.ts`)

Full list of additions:

```typescript
// Block type for robots.txt analysis
export type BlockType =
  | "explicit_allow" | "explicit_block"
  | "global_block" | "not_mentioned" | "no_robots";

// Per-bot detail exported in API response
export interface BotDetail {
  key: string; label: string; company: string;
  allowed: boolean; reason: string;
  directive: string | null; blockType: BlockType;
}

// Core Web Vitals
export interface SpeedMetricValue {
  displayValue: string; score: number | null; numericValue?: number;
}
export interface SpeedResult {
  strategy: "mobile" | "desktop";
  performanceScore: number | null;
  metrics: { lcp, cls, inp, fcp, ttfb, tbt: SpeedMetricValue };
  opportunities: { title, description, savingsMs? }[];
  diagnostics: string[];
  fetchTime: string; error?: string;
}

// Crawl page (updated)
export interface CrawlPage {
  // ... existing fields ...
  linkDepth: number;          // BFS depth from homepage
  inboundLinkCount: number;   // number of crawled pages linking here
}

// Crawl result (updated)
export interface CrawlResult {
  // ... existing fields ...
  robotsTxtFound: boolean;
  sitemapFound: boolean;
  orphanPages: string[];      // URLs with 0 inbound links
  avgLinkDepth: number;
}

// On AnalysisResult
_botResults?: BotDetail[];
keywords?: { word, count, inTitle, inH1, inMeta }[];
```

---

## 19. ResultsSection — New Panels Wired In

**File:** `components/ResultsSection.tsx`

Order of sections in scan results (bottom of page):

1. Header + summary
2. Prompts & Responses panel
3. Citations panel
4. Score gauges
5. AI Provider Results
6. **AI Platform Coverage** (enhanced — accessible/blocked split)
7. Stats bar
8. Category Breakdown (now 7 categories)
9. Recommendations
10. **Keyword Intelligence** (new)
11. **Core Web Vitals & Speed** (new — `SpeedSection`)
12. **Technical Crawl** (new — `CrawlSection`)

---

## 20. Summary — All Files Changed or Created

| File | Status | Summary |
|---|---|---|
| `app/settings/page.tsx` | Modified | +3 providers (You.com, DuckDuckGo, Meta AI) |
| `app/api/analyze/route.ts` | Modified | +3 provider functions, enhanced checkBot, safeFetch returns headers, buildTechData +20 fields, 2 new categories, keyword extraction, _botResults export |
| `app/api/crawl/route.ts` | Created | BFS crawler, per-page analysis, link depth, orphan detection |
| `app/api/pagespeed/route.ts` | Created | Google PSI integration, mobile + desktop CWV |
| `types/index.ts` | Modified | BlockType, BotDetail, SpeedResult, CrawlPage, CrawlResult updates, keywords on AnalysisResult |
| `components/ResultsSection.tsx` | Modified | Enhanced coverage UI, keyword panel, SpeedSection, CrawlSection wired in |
| `components/CrawlSection.tsx` | Created | Full crawl UI with sortable table, orphan pages, depth tracking |
| `components/SpeedSection.tsx` | Created | Core Web Vitals UI with gauges, metrics, opportunities |

---

## 21. Environment Variables — Full Reference

```env
# AI Analysis providers
GEMINI_API_KEY=           # Gemini 2.0 Flash
OPENAI_API_KEY=           # ChatGPT (GPT-4o-mini)
PERPLEXITY_API_KEY=       # Perplexity Sonar
ANTHROPIC_API_KEY=        # Claude 3.5 Sonnet
AZURE_OPENAI_KEY=         # Microsoft Copilot (Azure)
AZURE_OPENAI_ENDPOINT=    # Azure endpoint URL
AZURE_OPENAI_DEPLOYMENT=  # Azure deployment name

# New providers (added this session)
YOUCOM_API_KEY=           # You.com Developer API
META_AI_API_KEY=          # Together AI key (for Meta Llama models)

# Core Web Vitals (optional — works without key at lower rate limit)
PAGESPEED_API_KEY=        # Google PageSpeed Insights API key

# Firebase (existing)
# Set via Firebase Admin SDK service account
```

---

*Generated: 2026-05-16*
