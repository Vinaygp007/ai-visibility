# 🔍 Complete Analysis Flow: What Happens When You Enter a URL

## Step-by-Step Flow

### 1️⃣ **User Submits URL**
- User enters `https://example.com` in the UI
- Optional: Choose whether to run citations (default: **YES**)

---

### 2️⃣ **Cache Check** 
```
Key: "https://example.com|citations" or "https://example.com|basic"
```
- Checks Firebase for cached results (1-hour TTL)
- If found and not expired → Returns cached data immediately
- If expired or not found → Proceeds to fresh analysis

---

### 3️⃣ **Data Fetching** (Parallel)
Fetches 5 URLs simultaneously:
```
1. /robots.txt
2. /llms.txt  
3. /llms-full.txt
4. / (homepage HTML)
5. /sitemap.xml
```

**What's extracted:**
- Robots.txt: Which AI bots are allowed/blocked
- HTML: Meta tags, Open Graph, Schema.org, headings, canonical, etc.
- JSON-LD structured data
- Site name from og:site_name or <title>

---

### 4️⃣ **Deterministic Scoring** (Code-based, NOT AI)
**These scores are ALWAYS the same for the same website data:**

#### Categories Scored:
1. **AI Crawler Access** (🤖)
   - Checks 14 AI bots: GPTBot, ClaudeBot, PerplexityBot, etc.
   - Robots.txt presence
   
2. **llms.txt & AI Context** (📄)
   - llms.txt presence
   - llms-full.txt presence
   - Quality checks
   
3. **Structured Data** (🏗️)
   - Schema.org markup
   - JSON-LD
   - Open Graph tags
   - Twitter cards
   - Meta description
   
4. **Content Discoverability** (🔍)
   - XML Sitemap
   - Heading structure (H1/H2)
   - Page title
   
5. **Technical AI SEO** (⚙️)
   - HTTPS enabled
   - Mobile viewport
   - Canonical URLs
   - Language declaration

**Scoring Logic:**
- Pass = 100 points
- Warn = 50 points  
- Fail = 0 points
- Category score = average of all checks
- Overall score = average of all categories
- Grade: A+ (90+), A (80+), B (70+), C (55+), D (40+), F (<40)

---

### 5️⃣ **AI Analysis** (Parallel - 3 Models)

#### The Prompt Sent to AI:
```
"You are an AI Visibility Auditor. Based on this real data from {url}:

SITE: https://example.com
ROBOTS.TXT: found
BOTS ALLOWED: 14/14
LLMS.TXT: found
LLMS-FULL.TXT: not found
JSON-LD: found, types: Organization
SCHEMA.ORG: yes
OPEN GRAPH: present
META DESCRIPTION: present
HTTPS: yes
SITEMAP: found
CANONICAL: present
H1 COUNT: 1 | H2 COUNT: 6

Return ONLY this JSON (no markdown):
{
  "summary": "2 sentences about strengths and weaknesses",
  "recommendations": [
    {"priority": "high", "title": "...", "description": "...", "impact": "..."},
    ...5 recommendations total
  ]
}
```

#### Models Called (if API keys configured):
1. **Gemini 2.0 Flash** 
   - Model candidates: gemini-flash-latest, gemini-2.5-flash, etc.
   - 3 retry attempts on 429 rate limits
   - 8-20 second wait between retries

2. **ChatGPT GPT-4o-mini**
   - Uses json_object response format
   - max_tokens: 2000
   - temperature: 0.1

3. **Perplexity Sonar**
   - max_tokens: 800 (to avoid truncation)
   - Has JSON recovery logic for incomplete responses

**What AI Does:**
- ✅ Writes the `summary` text (2 sentences)
- ✅ Writes `recommendations` (title, description, impact)
- ❌ Does NOT calculate scores (those come from step 4)
- ❌ Does NOT affect the grade or category scores

**Result Merging:**
- Takes longest summary from any successful provider
- Deduplicates recommendations by topic keywords
- Keeps top 8 recommendations sorted by priority
- If all AI fails → Uses empty recommendations

---

### 6️⃣ **Citation Analysis** (Optional, Sequential)

**⏱️ Timing:** Runs AFTER main analysis (to avoid double-quota issues with Gemini)

**10-second wait** before citations if Gemini was used in main analysis

#### The Citation Prompt:
**MASSIVE prompt (1000+ lines) asking AI to:**
- Research the company's products/services
- Identify industry category & competitors  
- Find legal entity & compliance info
- Identify key personnel
- Analyze recent momentum
- Run competitive landscape analysis
- Simulate what AI would say about them
- Return sentiment analysis & visibility ranking

#### Models Used:
1. **Gemini 2.0 Flash** (with Google Search grounding)
   - Uses groundingMetadata to extract cited URLs
   - Counts domain mentions in response
   - Status: `success` | `failed` | `unavailable`
   - Skipped if Gemini failed in main analysis

2. **ChatGPT GPT-4o-mini** (with web_search_preview)
   - Uses OpenAI Responses API with web search
   - Extracts url_citation annotations
   - Returns live search results

3. **Perplexity Sonar** (with return_citations: true)
   - Native citation support
   - Returns all source URLs used

**What's Saved Per Provider:**
```javascript
{
  provider: "Gemini 2.0 Flash",
  query: "...full 1000+ line prompt...",
  systemPrompt: "You are an elite GTM strategist...",
  rawAnswer: "...full AI response text...",
  count: 18, // number of citations + domain mentions
  urls: ["https://example.com/page1", ...], // URLs citing the domain
  allCitationUrls: [...all sources used...],
  snippets: [...text snippets mentioning domain...],
  dataSource: "live_search",
  status: "success" | "failed" | "unavailable",
  error?: "Rate limit exceeded..."
}
```

---

### 7️⃣ **Final Response Assembly**

```javascript
{
  site_name: "Example Company",
  url: "https://example.com",
  overall_score: 94,           // ← FROM CODE (step 4)
  grade: "A+",                  // ← FROM CODE (step 4)
  summary: "...",               // ← FROM AI (step 5)
  stats: {                      // ← FROM CODE (step 4)
    checks_passed: 29,
    checks_failed: 0,
    checks_warned: 2
  },
  categories: [...],            // ← FROM CODE (step 4)
  ai_platform_coverage: {...},  // ← FROM CODE (step 4)
  recommendations: [...],       // ← FROM AI (step 5)
  citations: [...],             // ← FROM AI (step 6)
  _providers: [                 // ← METADATA
    {
      name: "Gemini 2.0 Flash",
      status: "success",
      score: 94,                // Same as overall_score
      durationMs: 6931,
      error: null
    },
    ...
  ],
  _cached: false
}
```

---

### 8️⃣ **Firebase Storage**

#### Collection: `scans`
#### Document ID: MD5 hash of cache key

**What's Saved:**
```javascript
{
  url: "https://example.com|citations",
  timestamp: 1776859574501,     // milliseconds
  createdAt: "2026-04-23T10:30:00.000Z", // ISO string
  data: {
    // THE ENTIRE RESPONSE FROM STEP 7
    site_name: "...",
    url: "...",
    overall_score: 94,
    grade: "A+",
    summary: "...",
    stats: {...},
    categories: [...],
    recommendations: [...],
    citations: [...],           // ← YES, FULL CITATION DATA SAVED
    _providers: [...],
    _cached: false
  }
}
```

**Cache Behavior:**
- ✅ **1-hour TTL** (3600000ms)
- ✅ Automatically expires and deletes old entries
- ✅ Two separate caches: one with citations, one without
- ✅ `bustCache: true` in request body skips cache

---

## 🎯 Key Points

### Scores Are Deterministic
The **overall_score**, **grade**, **category scores**, and **check statuses** are calculated by code based on actual website data. They are NOT influenced by AI. Same website data = same scores every time.

### AI Only Writes Text
AI providers (Gemini, ChatGPT, Perplexity) only write:
- Summary text
- Recommendation titles/descriptions/impacts

### Citations ARE Being Saved
✅ **YES**, the full citation analysis (including the massive prompt, raw AI response, and all URLs) is being saved in the `data.citations` array within each Firebase document.

When you load a report from `/api/reports`, you get the COMPLETE data structure including all citations.

### Provider Failures Are Graceful
- If Gemini fails → Try ChatGPT and Perplexity
- If all AI fails → Return scores with empty recommendations
- Citation failures don't block main analysis

### Rate Limit Handling
- Gemini: 3 retries with 8-20s waits
- 10s gap between main analysis and citations
- Gemini citations skipped if main analysis failed

---

## 🔍 What You See in Console

When you click a report in `/reports`:

```javascript
console.log("📊 MODAL - Full Report Data:", report);
// Shows complete structure

console.log("📊 Citations:", report.citations);
// Shows all 3 citation results with:
// - Full prompt (1000+ lines)
// - Complete AI response
// - All cited URLs
// - Status of each provider
```

---

## 📁 File Locations

- **Main Analysis:** `/app/api/analyze/route.ts`
- **Reports API:** `/app/api/reports/route.ts`
- **Firebase Utils:** `/lib/firebase.ts`
- **Types:** `/types/index.ts`

---

## ⚡ Performance

- **Cache hit:** ~50ms (Firebase read)
- **Cache miss (basic):** 15-30 seconds
  - Data fetch: 2-3s
  - AI analysis: 5-15s (parallel)
  - Scoring: <100ms
  
- **Cache miss (with citations):** 30-60 seconds
  - Main analysis: 15-30s
  - 10s wait
  - Citations: 10-20s (sequential)

---

## 🐛 Current State

✅ Scores are computed deterministically
✅ AI writes summaries and recommendations  
✅ All 3 AI providers run in parallel
✅ Citations run after main analysis
✅ **ALL data including citations IS being saved to Firebase**
✅ Reports page loads full data from Firebase
✅ Modal displays ALL citation data
✅ Console logs show complete data structure
