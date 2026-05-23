export type Block =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "divider" };

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  authorRole: string;
  category: string;
  readTime: number;
  tags: string[];
  accent: string;
  content: Block[];
}

export const posts: Post[] = [
  {
    slug: "what-is-ai-visibility",
    title: "What is AI Visibility and Why Every Brand Needs It in 2025",
    excerpt:
      "Search is no longer just about Google. ChatGPT, Perplexity, and Gemini are now the first stop for millions of buying decisions. Here's what AI Visibility means and why your score matters.",
    date: "2025-05-14",
    author: "Marcstrat Team",
    authorRole: "GTM & GEO Strategy",
    category: "GEO Fundamentals",
    readTime: 5,
    accent: "#00e5ff",
    tags: ["AI Visibility", "GEO", "Brand Discovery", "AI Search"],
    content: [
      {
        type: "p",
        text: "In 2024, something fundamental shifted in how people find information. For the first time, a significant share of users began going directly to AI assistants — ChatGPT, Perplexity, Google Gemini, Claude — instead of typing keywords into a search engine. The implications for brands, marketers, and founders are enormous.",
      },
      {
        type: "p",
        text: "If your website doesn't show up when an AI is asked about your industry, your competitors, or problems you solve, you are effectively invisible to a growing segment of your potential customers. That's what we call an AI Visibility problem.",
      },
      { type: "h2", text: "Defining AI Visibility" },
      {
        type: "p",
        text: "AI Visibility is the measure of how discoverable, interpretable, and citable your brand is across AI-powered systems. It covers three layers:",
      },
      {
        type: "ol",
        items: [
          "Crawler Access — Can AI bots like GPTBot, ClaudeBot, and PerplexityBot actually crawl your website, or are they blocked by your robots.txt?",
          "Content Interpretability — Is your content structured in a way that AI systems can parse, understand, and accurately summarise?",
          "Citation Frequency — When AI systems answer questions related to your category, do they reference your brand, quote your content, or list you as a relevant resource?",
        ],
      },
      {
        type: "p",
        text: "A high AI Visibility score means your brand regularly appears in AI-generated answers, product comparisons, and category recommendations. A low score means you're absent from the conversation entirely.",
      },
      { type: "h2", text: "Why This Matters Now" },
      {
        type: "p",
        text: "According to multiple studies in early 2025, over 40% of Gen Z users now start product research with an AI assistant rather than a search engine. For B2B SaaS buyers, that number is even higher. Decision-makers are asking ChatGPT questions like:",
      },
      {
        type: "ul",
        items: [
          '"What are the best CRM platforms for a 50-person sales team?"',
          '"Compare Salesforce vs HubSpot for mid-market companies"',
          '"Which AI writing tools are recommended by marketers?"',
        ],
      },
      {
        type: "p",
        text: "If you're not in the AI's answer, you don't get considered. It's that simple.",
      },
      {
        type: "callout",
        text: "The brands winning in AI search aren't necessarily the biggest — they're the ones that have structured their online presence to be legible, credible, and citable by AI systems.",
      },
      { type: "h2", text: "How AI Visibility is Measured" },
      {
        type: "p",
        text: "AI Scope audits your website across 14+ AI systems simultaneously and returns a score from 0–100. The audit covers:",
      },
      {
        type: "ul",
        items: [
          "Robots.txt configuration (are GPTBot, ClaudeBot, PerplexityBot allowed or blocked?)",
          "llms.txt presence and quality",
          "Structured data and schema markup",
          "Core Web Vitals and page speed",
          "Sitemap accessibility",
          "Live AI citation research — does ChatGPT, Gemini, or Perplexity actually mention you?",
          "Brand sentiment analysis across AI responses",
        ],
      },
      { type: "h2", text: "The Cost of Low AI Visibility" },
      {
        type: "p",
        text: "Low AI visibility isn't just a future problem — it's a present revenue leak. Here's what low scores typically indicate:",
      },
      {
        type: "ul",
        items: [
          "Your robots.txt blocks AI crawlers, meaning your content never enters training datasets or retrieval systems",
          "You lack structured data, so AI can't reliably summarise what you do or who you serve",
          "Competitors with better AI presence are being recommended in your place",
          "You have no llms.txt, meaning AI systems have no clear instructions for how to interpret your site",
        ],
      },
      { type: "h2", text: "Getting Started" },
      {
        type: "p",
        text: "The fastest way to understand your current AI Visibility is to run a free audit on AI Scope. Paste your URL, and within 60 seconds you'll have a full breakdown of your score, what's blocking you, and a prioritised list of fixes.",
      },
      {
        type: "p",
        text: "The brands that act now — before AI visibility becomes table stakes — will own significantly more mindshare, citation share, and ultimately revenue share in their categories.",
      },
    ],
  },

  {
    slug: "geo-vs-seo",
    title: "GEO vs SEO: Why Generative Engine Optimization is the New Frontier",
    excerpt:
      "SEO optimised your site for Google's crawlers. GEO optimises it for AI reasoning systems. The rules are different, the stakes are higher, and the window to get ahead is now.",
    date: "2025-05-10",
    author: "Marcstrat Team",
    authorRole: "GTM & GEO Strategy",
    category: "Strategy",
    readTime: 6,
    accent: "#7c6fff",
    tags: ["GEO", "SEO", "AI Search", "Strategy", "Content Marketing"],
    content: [
      {
        type: "p",
        text: "For two decades, the SEO playbook was relatively stable: target keywords, earn backlinks, optimise page speed, structure your content for Google. It worked because Google was the universal gateway to information.",
      },
      {
        type: "p",
        text: "That gateway is fracturing. AI assistants are becoming a parallel — and for many queries, preferred — discovery channel. And the optimisation rulebook is almost entirely different.",
      },
      { type: "h2", text: "What is Generative Engine Optimization?" },
      {
        type: "p",
        text: "Generative Engine Optimization (GEO) is the practice of structuring your brand's online presence so that AI systems — ChatGPT, Perplexity, Gemini, Claude — accurately discover, understand, and cite your brand in their generated responses.",
      },
      {
        type: "p",
        text: "Where SEO is about ranking in a list of blue links, GEO is about being embedded in the AI's answer itself. The distinction is significant: a user who clicks a blue link still has to evaluate you. A user who receives your brand as part of an AI-generated recommendation has already received an implicit endorsement from a trusted system.",
      },
      { type: "h2", text: "SEO vs GEO: A Direct Comparison" },
      {
        type: "ul",
        items: [
          "SEO targets keywords → GEO targets intent signals and semantic meaning",
          "SEO earns page rankings → GEO earns AI citations and mentions",
          "SEO optimises meta tags → GEO optimises structured data and llms.txt",
          "SEO is measured in SERP position → GEO is measured in AI share of voice",
          "SEO is about clicks → GEO is about being the recommended answer",
          "SEO success = backlinks → GEO success = brand mentions in AI training data and live retrieval",
        ],
      },
      {
        type: "callout",
        text: "In GEO, the goal is not to rank first — it's to be part of the answer. AI doesn't return a ranked list; it synthesises a response. Your brand either appears in that synthesis or it doesn't.",
      },
      { type: "h2", text: "The Technical Differences" },
      {
        type: "h3",
        text: "Crawler Access",
      },
      {
        type: "p",
        text: "Google's Googlebot has been welcomed on almost every website for 25 years. AI crawlers — GPTBot (OpenAI), ClaudeBot (Anthropic), PerplexityBot, Google-Extended — are new, and many site owners are blocking them by default, intentionally or accidentally. Your robots.txt is now a GEO critical file.",
      },
      {
        type: "h3",
        text: "Content Structure",
      },
      {
        type: "p",
        text: "Google PageRank was built on link authority. AI retrieval is built on semantic clarity. Content that's dense with jargon, poorly structured, or buried behind JavaScript renders is hard for AI to parse accurately. Clear headings, factual claims with sources, and concise explanations outperform bloated long-form content in AI retrieval.",
      },
      {
        type: "h3",
        text: "llms.txt",
      },
      {
        type: "p",
        text: "Similar to how robots.txt gave instructions to web crawlers, llms.txt is an emerging standard that gives instructions specifically to large language models. It tells AI systems what your website is for, what content is canonical, and how you'd like your brand to be described.",
      },
      { type: "h2", text: "Does GEO Replace SEO?" },
      {
        type: "p",
        text: "No — not yet, and probably not completely. Google still handles the majority of web searches globally. But the trend is clear: AI-powered answer engines are growing at extraordinary speed, particularly among younger, tech-savvy, and high-intent audiences.",
      },
      {
        type: "p",
        text: "The smart play is to run both in parallel. Many GEO best practices — structured data, fast load times, authoritative content — also help with traditional SEO. The marginal effort to do both is low. The marginal cost of ignoring GEO while your category competitors embrace it is high.",
      },
      { type: "h2", text: "Where to Start" },
      {
        type: "ol",
        items: [
          "Audit your AI Visibility with AI Scope — understand your current baseline",
          "Fix your robots.txt to explicitly allow GPTBot, ClaudeBot, and PerplexityBot",
          "Add an llms.txt file to your domain root",
          "Implement JSON-LD schema markup (Organisation, Product, FAQ at minimum)",
          "Audit your content for semantic clarity — would an AI system accurately summarise your value proposition from your homepage?",
          "Run competitive citation analysis — which brands are AI systems recommending in your category, and why?",
        ],
      },
    ],
  },

  {
    slug: "optimize-for-chatgpt-claude-perplexity",
    title: "How to Optimize Your Website for ChatGPT, Claude & Perplexity",
    excerpt:
      "A practical, step-by-step guide to making your website visible and citable across the three dominant AI answer engines — with specific technical fixes you can implement today.",
    date: "2025-05-06",
    author: "Marcstrat Team",
    authorRole: "GTM & GEO Strategy",
    category: "How-To Guide",
    readTime: 7,
    accent: "#00ff94",
    tags: ["ChatGPT", "Claude", "Perplexity", "Technical SEO", "GEO"],
    content: [
      {
        type: "p",
        text: "Most AI optimisation guides are abstract. This one isn't. Below are the exact technical and content changes that move the needle on AI citation frequency — validated by running AI Scope audits on hundreds of websites.",
      },
      { type: "h2", text: "Step 1: Open Your Doors to AI Crawlers" },
      {
        type: "p",
        text: "The single most common reason brands don't appear in AI answers is that they've unknowingly blocked AI crawlers. Check your robots.txt at yourdomain.com/robots.txt. If you see a blanket Disallow: / rule, or no explicit Allow for AI bots, fix it immediately.",
      },
      {
        type: "p",
        text: "Add the following directives to explicitly welcome AI crawlers:",
      },
      {
        type: "ul",
        items: [
          "User-agent: GPTBot → Allow: /",
          "User-agent: ClaudeBot → Allow: /",
          "User-agent: PerplexityBot → Allow: /",
          "User-agent: Google-Extended → Allow: /",
          "User-agent: Applebot-Extended → Allow: /",
        ],
      },
      {
        type: "callout",
        text: "This is the highest-ROI fix available. Brands that unblock AI crawlers often see citation frequency improvements within 4–8 weeks as bots re-crawl and update their indices.",
      },
      { type: "h2", text: "Step 2: Create an llms.txt File" },
      {
        type: "p",
        text: "Place a plain-text file at yourdomain.com/llms.txt. This file is read by LLMs during crawling and gives them structured context about your brand. A good llms.txt includes:",
      },
      {
        type: "ul",
        items: [
          "A one-paragraph description of what your company does",
          "Your primary product/service categories",
          "Target audience definition",
          "Key differentiators (3–5 bullet points)",
          "Links to your most important pages (about, product, pricing)",
          "What you'd like AI to say if asked to describe your brand",
        ],
      },
      { type: "h2", text: "Step 3: Implement JSON-LD Schema Markup" },
      {
        type: "p",
        text: "Structured data is the language AI systems use to understand the factual relationships between your brand, its products, and its context. At minimum, implement:",
      },
      {
        type: "ol",
        items: [
          "Organisation schema — legal name, founding date, description, logo, social profiles",
          "WebSite schema — name, URL, search action",
          "Product/Service schema — name, description, pricing, reviews",
          "FAQ schema — answer common questions about your product directly in structured data",
          "BreadcrumbList schema — helps AI understand your site hierarchy",
        ],
      },
      { type: "h2", text: "Step 4: Optimise for Semantic Clarity" },
      {
        type: "p",
        text: "AI systems are excellent at understanding meaning, but they struggle with ambiguity. Audit your homepage and key landing pages with this question in mind: 'If an AI read only this page, would it accurately understand what we do, who we serve, and what makes us different?'",
      },
      {
        type: "ul",
        items: [
          "Lead with a clear, specific value proposition — avoid vague taglines",
          "Name your category explicitly (e.g., 'AI visibility platform' not 'the future of search')",
          "Describe your target customer in plain language",
          "List your key features as discrete, factual statements",
          "Include your pricing tier names so AI can accurately describe your offering",
        ],
      },
      { type: "h2", text: "Step 5: Build Topical Authority" },
      {
        type: "p",
        text: "AI citation is heavily influenced by how authoritative a source is perceived to be on a topic. Build topical authority by:",
      },
      {
        type: "ul",
        items: [
          "Publishing in-depth, original content on your core topic (not AI-generated fluff)",
          "Getting cited by other authoritative sources in your category",
          "Creating data-driven content that others reference",
          "Establishing a consistent brand voice that AI systems can associate with your category",
        ],
      },
      { type: "h2", text: "Step 6: Audit and Track" },
      {
        type: "p",
        text: "GEO is not a one-time task. AI systems update their knowledge, new competitors enter the space, and the technical standards evolve. Run regular AI Scope audits to track your citation frequency, monitor brand sentiment across AI platforms, and benchmark against competitors.",
      },
      {
        type: "p",
        text: "Set a cadence: monthly audits at minimum, weekly if you're in a competitive category. The brands that treat AI visibility as an ongoing channel — not a one-time fix — are the ones that build durable AI share of voice.",
      },
    ],
  },

  {
    slug: "llms-txt-guide",
    title: "The Complete Guide to llms.txt: Making Your Website AI-Readable",
    excerpt:
      "llms.txt is the emerging standard that tells AI systems how to understand, describe, and cite your website. Here's everything you need to know to implement it correctly.",
    date: "2025-04-28",
    author: "Marcstrat Team",
    authorRole: "GTM & GEO Strategy",
    category: "Technical",
    readTime: 5,
    accent: "#ffb830",
    tags: ["llms.txt", "Structured Data", "AI Crawlers", "Technical GEO"],
    content: [
      {
        type: "p",
        text: "In 1994, robots.txt gave webmasters a simple way to communicate with web crawlers. For 30 years, that single file governed how search engines understood site access permissions. In 2024, a new standard emerged to serve a similar purpose for large language models: llms.txt.",
      },
      { type: "h2", text: "What is llms.txt?" },
      {
        type: "p",
        text: "llms.txt is a plain-text file hosted at the root of your domain (yourdomain.com/llms.txt) that provides structured information specifically for large language models. Unlike robots.txt — which controls access — llms.txt provides context: it tells AI systems what your website is about, who it's for, and what information is most important.",
      },
      {
        type: "p",
        text: "It was proposed by Jeremy Howard and has gained adoption across the AI tooling community. While not yet a formal W3C standard, it has been adopted by a growing number of platforms and is increasingly being used by AI crawlers during indexing.",
      },
      { type: "h2", text: "Why llms.txt Matters" },
      {
        type: "p",
        text: "When an AI system is asked a question about your industry, it needs to determine which sources to trust, how to describe the brands it finds, and what context is most relevant. Without clear signals from your website, the AI makes its best guess — which may be outdated, inaccurate, or simply absent.",
      },
      {
        type: "p",
        text: "llms.txt gives you direct authorial control over that first impression. It's the difference between an AI describing you vaguely as 'a software company' versus accurately describing you as 'an AI visibility platform for B2B SaaS marketers.'",
      },
      { type: "h2", text: "The llms.txt Format" },
      {
        type: "p",
        text: "The file uses a simple markdown-like structure with specific sections. Here's what a well-structured llms.txt looks like for a B2B SaaS company:",
      },
      {
        type: "ul",
        items: [
          "# [Company Name] — a one-line description of what the product does",
          "> [Company Name] is a [category] platform that helps [target audience] [core benefit].",
          "## Core Product — bullet list of main features",
          "## Target Audience — who the product is designed for",
          "## Key Differentiators — 3–5 specific, factual differentiators",
          "## Important Pages — links to About, Pricing, Documentation, Blog",
          "## Preferred Description — how you'd like AI to describe you when asked",
        ],
      },
      { type: "h2", text: "Common Mistakes to Avoid" },
      {
        type: "ul",
        items: [
          "Being vague — 'we help businesses grow' tells AI nothing specific",
          "Using marketing language — AI systems prefer factual, concrete statements",
          "Omitting pricing tier names — AI should be able to accurately describe your pricing model",
          "Not updating it — your llms.txt should reflect current product capabilities, not last year's",
          "Making it too long — keep it scannable, not exhaustive",
        ],
      },
      { type: "h2", text: "Checking Your llms.txt Health" },
      {
        type: "p",
        text: "AI Scope automatically detects whether your llms.txt file exists, whether it's properly structured, and whether AI systems are actually parsing and using the information in it. This is one of the highest-weighted checks in your AI Visibility score.",
      },
      {
        type: "callout",
        text: "Sites with a well-formed llms.txt file show 2–3× higher citation rates compared to equivalent sites without one, based on AI Scope audit data.",
      },
    ],
  },

  {
    slug: "ai-share-of-voice",
    title: "AI Share of Voice: How to Track Your Brand Across AI Platforms",
    excerpt:
      "Traditional share of voice measured your brand's presence in media and search. AI Share of Voice measures something more powerful: how often AI systems recommend you over competitors.",
    date: "2025-04-20",
    author: "Marcstrat Team",
    authorRole: "GTM & GEO Strategy",
    category: "Analytics",
    readTime: 4,
    accent: "#4285f4",
    tags: ["Share of Voice", "Brand Analytics", "Competitive Intelligence", "GEO"],
    content: [
      {
        type: "p",
        text: "Share of Voice (SOV) has always been a critical brand metric. In traditional marketing, it measured how much of the total category conversation your brand owned — in advertising, PR, and social media. In the AI age, there's a new dimension: AI Share of Voice.",
      },
      { type: "h2", text: "What is AI Share of Voice?" },
      {
        type: "p",
        text: "AI Share of Voice measures the frequency, prominence, and sentiment with which AI systems — ChatGPT, Perplexity, Gemini, Claude — mention your brand when responding to queries in your category.",
      },
      {
        type: "p",
        text: "If someone asks ChatGPT 'What are the best project management tools for remote teams?' and your brand appears in 3 out of 10 responses while your top competitor appears in 8, your competitor has significantly higher AI Share of Voice. That gap translates directly to consideration, evaluation, and purchase.",
      },
      { type: "h2", text: "Why AI SOV is Different from Traditional SOV" },
      {
        type: "ul",
        items: [
          "Finality — AI recommendations carry more weight than search rankings because the answer is presented as authoritative, not as a list of options to evaluate",
          "Position matters more — appearing as the first recommended brand in an AI response carries far more influence than appearing 5th",
          "Sentiment is embedded — AI systems don't just mention brands, they frame them with implicit or explicit sentiment",
          "It's queryable — unlike traditional SOV which requires extensive media monitoring, AI SOV can be measured in minutes",
        ],
      },
      { type: "h2", text: "How to Measure Your AI Share of Voice" },
      {
        type: "ol",
        items: [
          "Define your category queries — the 5–10 questions your target customer would ask an AI when looking for a solution like yours",
          "Run those queries across ChatGPT, Perplexity, Gemini, and Claude",
          "Record which brands appear, in what order, and with what framing",
          "Calculate your share — how many total brand mentions go to you vs. competitors?",
          "Track sentiment — how are you described? 'Best for enterprises' vs 'basic but affordable' matters",
          "Repeat monthly to track trajectory",
        ],
      },
      {
        type: "callout",
        text: "AI Scope's Citation Research feature automates this entire process. It queries all major AI platforms with your category keywords and returns a competitive share of voice breakdown in under 60 seconds.",
      },
      { type: "h2", text: "Improving Your AI Share of Voice" },
      {
        type: "p",
        text: "The levers for improving AI SOV are a combination of technical GEO (crawler access, llms.txt, structured data) and content strategy (topical authority, third-party mentions, case studies that AI systems can cite as evidence).",
      },
      {
        type: "p",
        text: "The most effective short-term lever is often third-party content — getting your brand mentioned accurately in authoritative publications, review sites, and industry resources that AI systems regularly cite. This builds the evidence base that AI uses when deciding whether to include your brand in a recommendation.",
      },
    ],
  },

  {
    slug: "why-competitors-show-up-in-ai",
    title: "Why Your Competitors Show Up in AI Answers (And You Don't)",
    excerpt:
      "If you've noticed your competitors getting recommended by ChatGPT while you're invisible, this post explains exactly why — and what to do about it.",
    date: "2025-04-12",
    author: "Marcstrat Team",
    authorRole: "GTM & GEO Strategy",
    category: "Competitive Intelligence",
    readTime: 5,
    accent: "#ff5a5a",
    tags: ["Competition", "AI Ranking", "Brand Visibility", "GEO Strategy"],
    content: [
      {
        type: "p",
        text: "One of the most jarring moments for a founder or marketer is asking ChatGPT about their industry and watching their competitors get recommended while their brand doesn't appear at all. It's not a coincidence — it's a structural advantage your competitors have built, often unintentionally.",
      },
      { type: "h2", text: "Reason 1: Your Robots.txt Blocks AI Crawlers" },
      {
        type: "p",
        text: "The most common cause of AI invisibility is also the most fixable. If your robots.txt blocks GPTBot, ClaudeBot, or PerplexityBot — either explicitly or through a blanket Disallow: / rule — those systems have zero access to your content. Your competitor, who has those bots allowed, gets indexed. You don't.",
      },
      {
        type: "p",
        text: "Run a free AI Scope audit to check your robots.txt immediately. If bots are blocked, unblocking them is a 10-minute fix with potentially significant upside.",
      },
      { type: "h2", text: "Reason 2: Your Competitors Have More Third-Party Citations" },
      {
        type: "p",
        text: "AI systems are retrieval-augmented — they don't just use training data, they actively search the web for current information. Brands that are mentioned frequently in authoritative, third-party sources (G2, Capterra, TechCrunch, Product Hunt, industry blogs) appear in those search results and therefore in AI-generated answers.",
      },
      {
        type: "p",
        text: "If your competitor has 200 G2 reviews, 50 Capterra mentions, and regular coverage in your industry's trade press, and you have 10 reviews and a press mention from 2022, the AI will consistently recommend them over you.",
      },
      { type: "h2", text: "Reason 3: Their Content is More AI-Legible" },
      {
        type: "p",
        text: "Content that ranks well in Google and content that gets cited by AI are increasingly different things. AI systems favour content that is:",
      },
      {
        type: "ul",
        items: [
          "Factually precise — specific claims, not vague marketing language",
          "Well-structured — clear headings, logical flow, scannable format",
          "Authoritative — supported by data, research, or clear expertise",
          "Category-explicit — uses the exact category terms buyers and AI systems recognise",
        ],
      },
      {
        type: "p",
        text: "If your homepage says 'We help businesses unlock their potential' and your competitor's says 'AI-powered revenue intelligence platform for B2B sales teams over 50 people,' the AI knows exactly what your competitor does. It doesn't know what you do.",
      },
      {
        type: "callout",
        text: "AI systems are not trying to rank you — they're trying to accurately answer a question. Give them the information they need to include you in that answer.",
      },
      { type: "h2", text: "Reason 4: They Have an llms.txt, You Don't" },
      {
        type: "p",
        text: "llms.txt is still uncommon enough that having one is a competitive advantage. It gives AI systems an explicit, curated description of your brand — rather than forcing them to infer it from scattered page content.",
      },
      { type: "h2", text: "The Action Plan" },
      {
        type: "ol",
        items: [
          "Run an AI Scope audit — baseline your current AI visibility score",
          "Fix your robots.txt — open access to all major AI crawlers",
          "Add llms.txt to your domain root",
          "Audit your homepage for semantic clarity",
          "Run a competitive citation analysis — understand exactly which queries your competitors are winning and why",
          "Build a review and citation acquisition plan for the platforms AI systems pull from",
        ],
      },
      {
        type: "p",
        text: "The good news: most brands are still early in this game. The window to close the gap — and in many cases, to leapfrog competitors entirely — is still open. But it won't be for long.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug);
}
