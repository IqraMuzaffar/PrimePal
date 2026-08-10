# Hasnain Sohail — Portfolio Website Design Spec

**Date:** 2025-06-24
**Author:** Iqra (Planner) — Hasnain implements
**Status:** Approved Design — Ready for Implementation Planning

---

## 1. Overview

### 1.1 Purpose

Revamp Hasnain Sohail's portfolio website (currently at okragrey.github.io/portfolio) into a premium, client-facing platform that:

- **Primary:** Attracts freelance/contract clients for AI product engineering work
- **Secondary:** Establishes Hasnain as a recognized AI expert and thought leader

### 1.2 Target Audience

Decision-makers, startup founders, and product managers looking to hire an AI engineer. The tone is **professional and accessible** — not deeply technical. People should know about Hasnain's expertise without needing an engineering background to understand it.

### 1.3 Phasing

| Phase | Scope | When |
|-------|-------|------|
| **Phase 1** | Hero, Expertise Carousel, 7 Project Showcases, Blog (MDX), About/Credentials, Contact Hub, Design System | Build now |
| **Phase 2** | RAG Chatbot ("Ask Hasnain"), FastAPI backend upgrade, Analytics | Add later |

---

## 2. Tech Stack

### Phase 1

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Hosting | Vercel (free tier) |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Blog | MDX (local files in `/content/blog/`) |
| Contact Form | Vercel serverless function → email (Resend or similar) |
| Icons | Lucide React or Heroicons |
| Carousel | Embla Carousel (lightweight, accessible) |

### Phase 2 (Future)

| Layer | Technology |
|-------|-----------|
| Chatbot UI | Vercel AI SDK |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | Vercel Postgres + pgvector (or Pinecone) |
| LLM | OpenAI GPT-4o-mini (cost-effective for chat) |
| Backend Upgrade | FastAPI + LangChain (replaces Vercel API routes) |
| Analytics | PostHog or Vercel Analytics |

---

## 3. Site Architecture

### 3.1 Navigation

```
[HASNAIN SOHAIL]     Work    Expertise    Blog    About    [Contact] (CTA button)
```

- Sticky nav, transparent on hero → solid on scroll
- Mobile: hamburger menu
- "Contact" is always a highlighted CTA button in nav

### 3.2 Page Structure

```
/                       → Homepage (all sections below)
/projects/[slug]        → Individual case study pages (7 total)
/blog                   → Blog listing page
/blog/[slug]            → Individual blog post
```

### 3.3 Homepage Section Flow

```
Hero → Expertise Carousel → Featured Projects → Project Grid → Blog Preview → About → Contact
```

All sections on a single scrollable page with smooth scroll navigation.

---

## 4. Section Specifications

### 4.1 Hero Section

**Layout:** Full viewport height, dark background

**Elements:**
- Subtle animated background (particle grid or mesh gradient — keep the current site's vibe but elevated)
- "HASNAIN SOHAIL" — large, bold, white
- Rotating tagline underneath (typewriter or fade effect):
  - "I build AI products that ship."
  - "From zero to production in 30 days."
  - "Generative. Agentic. Multimodal. Production."
- Stats row below tagline:

| Stat | Value |
|------|-------|
| Experience | 5+ Years |
| Clients | Fortune 500 |
| Speed | 30-Day MVPs |
| Delivery | Full Stack AI |

- Two CTA buttons:
  - "See My Work" → smooth scroll to projects section
  - "Let's Talk" → smooth scroll to contact section
- Bottom of hero: location "Lahore, PK" + availability indicator "Available 2026"

**Content Guidance:**
- Tagline must be client-facing. NOT "I research diffusion models." YES "I build AI products that ship."
- Stats should be verifiable claims — don't overstate

### 4.2 Expertise Carousel

**Layout:** Horizontal swipeable carousel, 6 cards visible in rotation

**Behavior:**
- Auto-play (slow, ~5 seconds per card)
- Manual swipe/drag on mobile, arrow buttons on desktop
- Pause auto-play on hover
- Use Embla Carousel for implementation

**Cards (6 total):**

| # | Title | One-liner | Links to Project |
|---|-------|-----------|-----------------|
| 1 | Multi-Agent Systems | "Orchestrating AI agents that reason, decide, and act together" | Creator Recommender |
| 2 | RAG Pipelines | "Knowledge retrieval systems that give AI real context" | PrimePal |
| 3 | AI SaaS MVPs | "Zero to production AI products in under 30 days" | AI Creation Studio |
| 4 | Scalable Architecture | "Building backends that hold 1000+ concurrent users" | Scale Architecture |
| 5 | LLM Integration | "Connecting GPT-4, Claude, Gemini to production applications" | Enterprise AI |
| 6 | Multimodal AI | "Vision, language, and generation in one pipeline" | Moments Engine |

**Card Design:**
- Icon (abstract, not emoji) + Title + One-liner
- Subtle gradient background
- On click → scrolls to the linked project in the grid, or navigates to case study

### 4.3 Featured Projects Carousel

**Layout:** Large rotating showcase, 3 featured projects

**Behavior:**
- Auto-rotate every 6 seconds
- Navigation dots + arrow buttons
- Each card is full-width with image left / text right (or stacked on mobile)

**Featured Projects:**

| # | Project | Headline | One-liner |
|---|---------|----------|-----------|
| 1 | AI Creation Studio | "Multi-Modal AI Generation at Scale" | "Style selection → AI generation → editing → try-on → 3D/video. 473+ generations, 248 styles, 118 models." |
| 2 | PrimePal | "AI Tutor for 50+ Pakistani Students" | "Three-agent architecture teaching English to primary school students in rural Pakistan." |
| 3 | Creator Recommender | "AI That Understands Your Brand" | "Give it a social handle — it analyzes the brand and recommends matching styles in minutes." |

**Each card includes:**
- Project mockup/screenshot (Hasnain to provide or create)
- Title + headline + one-liner
- 3-4 tech tags
- "View Case Study →" CTA button

### 4.4 Project Grid

**Layout:** Filterable card grid below the featured carousel

**Filter Tabs:**
```
All  |  AI Agents  |  Generation  |  Scaling  |  Education
```

**7 Project Cards:**

| # | Project | Slug | Category | Card Description | Key Tech Tags |
|---|---------|------|----------|-----------------|---------------|
| 1 | AI Creation Studio | `ai-creation-studio` | Generation | "Built a multi-modal AI generation pipeline handling 473+ generations across flat, on-model, 3D, and video formats" | Gemini, Async, FastAPI, Next.js |
| 2 | Moments Engine | `moments-engine` | Generation | "Turn YouTube and Instagram content into product ideas — content analysis, engagement heatmaps, AI-powered ideation" | YouTube API, Whisper, Apify, Redis |
| 3 | Creator Recommender | `creator-recommender` | AI Agents | "LangGraph agent that scrapes a creator's social presence, analyzes their brand, and recommends matching styles" | LangGraph, LLM Agents, Taxonomy |
| 4 | Audience Insights | `audience-insights` | AI Agents | "Real-time comment analysis for YouTube and Instagram with streaming results — at $0.10 per post" | SSE, Streaming, Apify, Bento UI |
| 5 | Scale Architecture | `scale-architecture` | Scaling | "Took a feature-rich demo to 1000+ concurrent users — async everywhere, job queues, cost metering, 14 security audits" | SAQ, Redis, Prometheus, k6 |
| 6 | PrimePal | `primepal` | Education | "3-agent AI tutor (Curriculum Guardrail + Tutor + Evaluator) deployed for 50+ students at a Pakistani primary school" | Multi-Agent, RAG, Supabase, pgvector |
| 7 | Enterprise AI | `enterprise-ai` | AI Agents | "Led LLM teams at Turing on Meta and Apple projects — enterprise-grade AI systems for Fortune 500 clients" | LLMs, Team Lead, Enterprise |

**Card Design:**
- Thumbnail/mockup image (top)
- Title + one-liner (middle)
- Tech tags as pills (bottom)
- Hover: subtle lift + glow effect
- Click → navigates to `/projects/[slug]`

### 4.5 Case Study Pages (`/projects/[slug]`)

**Template — every project follows this structure:**

```
[Back to Projects]

Project Title
One-line subtitle

─────────────────────────────────

THE PROBLEM
What challenge was being solved and why it mattered.
(2-3 paragraphs, accessible language)

THE APPROACH
How Hasnain solved it — architecture decisions, key choices.
(2-3 paragraphs + optional architecture diagram)

ARCHITECTURE
Visual diagram showing system components and data flow.
(Hasnain to create — can use Excalidraw, Mermaid, or designed SVG)

KEY RESULTS
Bullet points with measurable outcomes:
- "473+ generations processed"
- "248 curated styles"
- "1000+ concurrent users supported"

TECH STACK
Visual pills grouped by layer: AI / Backend / Frontend / Infrastructure

─────────────────────────────────

[← Previous Project]    [Next Project →]
[Have a similar project? Let's talk. →]
```

**Content guidance for each project:**

**1. AI Creation Studio**
- Problem: Creators need product imagery but can't design. Manual process is slow and expensive.
- Approach: Built a full generation pipeline — style selection from 248 options, AI generation (Gemini), in-place editing, virtual try-on, 3D views, and video. Async batch processing for scale.
- Key results: 473+ generations, 248 styles, 118 models, 1,695 library images. Thread-safe Gemini singleton, chunked uploads for 20MB limit.
- Tone: "I built the engine that turns a style + prompt into production-ready product imagery across every format."

**2. Moments Engine**
- Problem: Creators don't know which of their content resonates most for merch. Manual analysis is guesswork.
- Approach: Automated pipeline — ingest YouTube/Instagram → pull transcripts (with Whisper fallback) → engagement heatmaps → extract top moments → generate merch ideas → hand off to Creation Studio.
- Key results: 45 videos analyzed, 115 moments extracted, 45 idea sets generated. Cache-first with TTL cleanup. Multi-source fallback chains.
- Tone: "I built a system that watches what audiences love and turns it into product ideas automatically."

**3. Creator Recommender**
- Problem: New creators don't know which styles match their brand. Cold-start problem.
- Approach: LangGraph agent pipeline — scrape social presence → derive brand identity → map onto 91-style taxonomy → return ranked recommendations with reasoning.
- Key results: 10 recommendations per creator, 91-style taxonomy, configurable agent (tunable without code changes), dedicated testing harness.
- Tone: "Give it a social handle and it understands a creator's brand in minutes — then recommends exactly the right styles."

**4. Audience Insights**
- Problem: Understanding what an audience actually says at scale is expensive and slow.
- Approach: Fetch YouTube/Instagram comments → extract themes + sentiment + product signals → stream results to UI live via SSE. "Mission Control" bento grid interface.
- Key results: YouTube + Instagram live, $0.10–$0.38 per post, progressive SSE rendering. Job-queue backed for large batches.
- Tone: "Real-time audience intelligence — streamed to your screen as the AI reads thousands of comments."

**5. Scale Architecture**
- Problem: The platform worked as a demo but couldn't handle real users. Timeouts, blocking calls, no observability.
- Approach: 4-phase scaling — (1) event loop unblocking (172 blocking calls → asyncio.to_thread), (2) SAQ Redis job queue, (3) async generation migration (7 endpoints + 12 routes), (4) Prometheus/Grafana observability.
- Key results: 24 worker tasks, 23 job types, 1000+ concurrent user capacity. 14 security audit tickets. k6 load tested.
- Tone: "I took a demo and turned it into infrastructure that holds 1000+ users — async everywhere, fully observable, security-hardened."

**6. PrimePal**
- Problem: Pakistani primary school students lack access to quality English language tutoring.
- Approach: Three-agent AI system — Curriculum Guardrail (ensures age-appropriate content), Tutor (interactive lessons), Evaluator (assesses learning). Built with Next.js 14 + FastAPI + Supabase + pgvector.
- Key results: Deployed to 50+ students at The Savior School Pattoki, 2-week field intervention, quasi-experimental study design.
- Tone: "AI tutoring that actually works in a classroom — tested with real students in rural Pakistan."

**7. Enterprise AI (Turing)**
- Problem: Fortune 500 companies need production-grade LLM systems, not demos.
- Approach: Led LLM teams on projects for Meta and Apple. Enterprise-level quality, process, and delivery.
- Key results: Fortune 500 client delivery, team leadership, production-grade systems.
- Tone: "Led AI teams building production systems for the biggest names in tech." (Keep brief — NDA constraints.)

### 4.6 Blog Platform

**Route:** `/blog` (listing) and `/blog/[slug]` (post)

**Content Storage:** MDX files in `/content/blog/` with frontmatter:

```yaml
---
title: "Why Most AI MVPs Fail"
date: "2025-07-01"
category: "AI Strategy"
readingTime: "5 min"
description: "What I've learned shipping AI products about why most never make it to production."
---
```

**Blog Listing Page:**
- Grid of post cards: title, category tag, reading time, date, 2-line excerpt
- Filter by category (optional — can be Phase 2 if needed)
- Categories: **AI Strategy** / **Building AI Products** / **Case Studies**

**Blog Post Page:**
- Clean reading experience, max-width ~700px
- Title, date, category, reading time at top
- MDX content (supports custom components, code blocks, images)
- Share buttons (Twitter/X, LinkedIn, copy link)
- "More Posts" section at bottom with 2-3 related posts
- CTA at bottom: "Want to build something like this? Let's talk."

**Homepage Blog Preview:**
- Shows latest 3 blog posts as cards
- "Read the Blog →" link to full listing

**Starter Blog Topics (Content Guidance for Hasnain):**

| # | Title | Category | Angle |
|---|-------|----------|-------|
| 1 | "Why Most AI MVPs Fail (And How to Ship One That Doesn't)" | AI Strategy | Draw from experience shipping Amaze + PrimePal. Focus on common mistakes clients make. |
| 2 | "Multi-Agent vs Single Agent: When Each Makes Sense" | Building AI Products | Use Creator Recommender and PrimePal as examples. Accessible — no code. |
| 3 | "How I Scaled an AI Platform to 1000+ Users" | Case Studies | The Amaze scaling story (Phase 1-4) told for a non-technical audience. |
| 4 | "The Real Cost of AI Features — What Clients Should Know" | AI Strategy | Draw from Audience Insights cost data ($0.10/post). Help clients budget realistically. |
| 5 | "RAG Done Right: Lessons From Production" | Building AI Products | What makes RAG work vs fail in real products. Draw from PrimePal. |
| 6 | "What Fortune 500 Companies Actually Need From AI Engineers" | AI Strategy | Turing/Meta/Apple experience. Enterprise vs startup expectations. |

**Trending Topic Blogs — Vision-Language Models (VLMs):**

These topics position Hasnain as someone who tracks the frontier and can translate it for decision-makers. The VLM market is projected to reach $41.75B by 2035 — this is where the industry is heading.

| # | Title | Category | Angle | Why It's Hot |
|---|-------|----------|-------|-------------|
| 7 | "Vision-Language Models in 2026: From Seeing to Doing" | AI Strategy | The shift from VLMs that describe images to ones that actuate (robotic arms, software navigation). Explain what this means for products. Reference Gemini 2.5 Pro, GPT-4o, SigLIP 2. | VLMs are now production-ready infra, not experiments. $3.84B market in 2025. |
| 8 | "The Death of Image-Only Models: Why Video-First AI Is the Future" | Building AI Products | By 2027, standalone image models will be obsolete — next-gen frontier models treat images as single-frame videos. What this means for businesses building visual AI features. | Major architectural shift — directly relevant to Hasnain's Creation Studio work. |
| 9 | "Open-Source VLMs That Actually Work: A Builder's Guide to 2026" | Building AI Products | Accessible comparison of Qwen2.5-VL, LLaVA, PaliGemma 2, DeepSeek-VL2. Not benchmarks — real-world deployment advice. When to use which, and what to watch for. | Clients ask "which model?" — this answers it without the PhD jargon. |
| 10 | "Multimodal AI for Products: Where Vision Meets Language Meets Revenue" | AI Strategy | How businesses are actually using VLMs — document processing, retail visual search, quality inspection, content moderation. Real use cases, not research demos. | Bridges the gap between research hype and business value. |

**Trending Topic Blogs — Edge AI & On-Device Models:**

Edge AI is exploding — 40%+ of enterprise AI workloads will be on SLMs by 2027 (Gartner). Hasnain writing about this signals he's not just a cloud API wrapper developer.

| # | Title | Category | Angle | Why It's Hot |
|---|-------|----------|-------|-------------|
| 11 | "Small Language Models Are Eating the World: Why Less Is More in 2026" | AI Strategy | The shift from 175B parameter models to 3-7B models that cost 10-30x less and run on edge hardware. Phi-4-mini, Mistral 7B, Qwen 2.5. What this means for product costs and privacy. | SLM market hitting $12.85B by 2030. Gartner says 3x more SLMs than LLMs by 2027. |
| 12 | "Running AI Without the Cloud: A Practical Guide to On-Device LLMs" | Building AI Products | Break down the four drivers (latency, privacy, cost, availability). Cover NPUs, ExecuTorch, Snapdragon X2 (80 TOPS). Real deployment patterns — kiosks, mobile apps, embedded. No code, just architecture decisions. | Clients with privacy concerns (healthcare, finance, govt) need this. |
| 13 | "Vision AI on Your Phone: How SmolVLM and MiniCPM-V Changed Everything" | Building AI Products | Models under 1GB running vision-language tasks on mobile. SmolVLM-256M outperforming models 300x its size. What's now possible vs what's still hard (thermal, power constraints). | Mind-blowing efficiency gains. Shows Hasnain tracks the cutting edge. |
| 14 | "Edge AI for Business: When to Keep AI Local (And When the Cloud Still Wins)" | AI Strategy | Decision framework for clients: when edge makes sense (real-time, privacy, offline) vs when cloud is better (complex reasoning, multi-step agents). Cost comparison with real numbers. | The most client-useful topic — directly helps buyers make architecture decisions. |

**Writing style guidance:** Write for decision-makers, not engineers. Short paragraphs, clear language, real examples. Show expertise through clarity, not jargon. For trending topics, lead with the business implication, then explain the technology — never the other way around.

### 4.7 About / Credentials

**Layout:** Two-column on desktop, stacked on mobile

**Left Column — Bio:**
- Professional photo or high-quality avatar (Hasnain to provide)
- Name: Hasnain Sohail
- Title: AI Product Engineer
- Brief bio (3-4 sentences):
  > "I'm an AI Product Engineer with a Master's in AI from LUMS and 5+ years of experience building production AI systems. I've led LLM teams at Turing on projects for Meta and Apple, and I've shipped AI SaaS products from zero to production in under 30 days. I specialize in multi-agent systems, RAG pipelines, and full-stack AI applications. I build intelligence — and I ship it."

**Right Column — Credentials + Stack:**

**Credentials:**
- MS Artificial Intelligence — LUMS (Pakistan's top university)
- LLM Lead — Turing (Meta, Apple projects)
- AI Product Engineer — 5+ years

**Tech Stack (visual pills grouped):**

| Domain | Technologies |
|--------|-------------|
| AI / LLM | Claude, GPT-4, Gemini, LangChain, LangGraph, RAG, Pinecone, ChromaDB |
| Backend | FastAPI, Python, REST APIs, WebSockets, Redis, SAQ |
| Frontend & DB | Next.js 14, React, Tailwind CSS, Supabase, PostgreSQL, pgvector |
| Infrastructure | Vercel, Docker, Prometheus, Grafana |

**"Why Work With Me" — 4 cards:**

| Card | Title | Copy |
|------|-------|------|
| 1 | Ships Fast | "AI products from zero to production in under 30 days. No endless back-and-forth — just results." |
| 2 | Enterprise-Proven | "Built AI systems for Fortune 500 companies. I know the difference between a demo and production code." |
| 3 | Full Stack, Not Just AI | "Frontend, backend, database, auth, deployment. The complete product, not just the AI layer." |
| 4 | Clean Handoff | "Every project: clean code, full documentation, walkthrough. You own it completely." |

### 4.8 Contact Hub

**Layout:** Full-width section with centered content

**Headline:** "Have an AI project? Let's talk."
**Subtext:** "I respond within 24 hours. Tell me what you're building and I'll give you an honest assessment."

**Contact Form Fields:**
- Name (required)
- Email (required)
- Project Description (textarea, required)
- Budget Range (optional dropdown: <$500 / $500-$2K / $2K-$5K / $5K+)
- Submit button: "Send Message"

**Form Backend:** Vercel serverless function → sends email via Resend API (or similar)

**Direct Contact Links (below form):**
- Email: [hasnain's email]
- LinkedIn: [hasnain's profile]
- GitHub: [okragrey]
- Location: Lahore, Pakistan

**Nav CTA:** "Contact" button in nav always links to this section.

---

## 5. Design System

### 5.1 Visual Direction

- **Theme:** Dark premium (keep current site's DNA but elevated)
- **Background:** Deep navy/black (#0a0a0f to #0d1117)
- **Primary accent:** Cyan/teal (#00bcd4)
- **Secondary accent:** Gold (#f5c518) for highlights/badges
- **Text:** White (#ffffff) for headings, light gray (#a0b4c0) for body
- **Cards:** Dark surface (#14141f) with subtle borders (#2a2a3a)

### 5.2 Typography

| Element | Font | Weight | Size (desktop) |
|---------|------|--------|----------------|
| Hero name | Inter or Space Grotesk | 800 | 72-96px |
| Section headings | Inter | 700 | 32-40px |
| Card titles | Inter | 600 | 18-22px |
| Body text | Inter | 400 | 15-16px |
| Tags/labels | Inter | 600 | 11-12px, uppercase |

### 5.3 Animations (Framer Motion)

| Element | Animation |
|---------|-----------|
| Hero text | Fade up on load, staggered |
| Hero background | Subtle particle/mesh animation (CSS or canvas) |
| Stats | Count-up animation on scroll into view |
| Section headings | Fade in on scroll |
| Project cards | Staggered fade up on scroll |
| Card hover | Subtle lift (translateY -4px) + border glow |
| Page transitions | Fade between routes |
| Carousel | Smooth slide with spring physics |

### 5.4 Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| Desktop (1024px+) | Full layout, all carousels horizontal |
| Tablet (768-1023px) | 2-column grids → 1-column, carousel still swipeable |
| Mobile (<768px) | Single column, hamburger nav, stacked cards |

---

## 6. Phase 2 — Future Features

### 6.1 RAG Chatbot — "Ask Hasnain"

**Trigger:** Floating chat button (bottom-right corner)
**UI:** Slide-out drawer with chat interface

**Knowledge Base:**
- Hasnain's resume/gig profile
- All 5 Amaze module documents
- Blog posts (auto-ingested as new posts are published)

**Guardrails:**
- Only answers questions related to Hasnain's professional work, skills, and experience
- Deflects personal or inappropriate questions with: "I can only answer questions about Hasnain's professional work. For anything else, please use the contact form."
- Redirects project inquiries: "Sounds like you have a project in mind! Use the contact form and Hasnain will get back to you within 24 hours."
- No hallucination — if unsure, says "I don't have information about that."

**Tech:**
- Vercel AI SDK for streaming chat UI
- OpenAI text-embedding-3-small for embeddings
- Vercel Postgres + pgvector (or Pinecone free tier) for vector store
- GPT-4o-mini for responses (cost-effective)
- System prompt enforces personality: professional, helpful, concise — reflects Hasnain's communication style

**The chatbot itself is a portfolio piece** — it demonstrates that Hasnain builds RAG systems.

### 6.2 FastAPI Backend Upgrade

Replace Vercel API routes with dedicated FastAPI backend:
- LangChain for more sophisticated RAG pipeline
- pgvector on Supabase for vector storage
- Better control over embedding pipeline and retrieval
- Matches Hasnain's actual tech stack (dogfooding)

### 6.3 Analytics

- Track which projects get the most views
- Track chatbot queries (what do visitors ask about?)
- Track contact form submissions
- PostHog or Vercel Analytics

---

## 7. Media & Asset Guide for Hasnain

This section tells Hasnain exactly what images, videos, and visuals to prepare, where each one goes, and what format/size to use.

### 7.1 Profile & Branding

| Asset | Where It Goes | Spec | Notes |
|-------|--------------|------|-------|
| **Professional headshot** | About section, OG meta image, favicon area | 800x800px minimum, square crop, PNG or WebP | Solid dark background preferred (matches site theme). No casual selfies — studio or high-quality phone portrait with good lighting. |
| **Logo / wordmark** (optional) | Navbar, favicon | SVG preferred, 40px height | If no logo, the site uses text "HASNAIN SOHAIL" in nav — which is fine. |
| **Favicon** | Browser tab | 32x32 ICO + 180x180 apple-touch-icon | Can be initials "HS" in cyan on dark background. |
| **OG preview image** | Social media shares (LinkedIn, Twitter) | 1200x630px, PNG | Name + title + "AI Product Engineer" on dark background. Used when someone shares the homepage URL. |

### 7.2 Project Media — Per Project

Every project needs media for **three places**: the project card (grid), the featured carousel, and the case study page.

#### Required per project:

| Asset | Where | Spec | What to capture |
|-------|-------|------|----------------|
| **Card thumbnail** | Project grid card | 600x400px, WebP or PNG | A single clean screenshot of the project's main UI. Crop to show the most impressive screen. |
| **Hero image** | Featured carousel (top 3 only) + case study page header | 1200x700px, WebP or PNG | The "money shot" — the most visually impressive view of the project. Can be a browser mockup frame or a clean full-screen capture. |
| **Architecture diagram** | Case study page "Architecture" section | SVG preferred (or 1200px wide PNG) | System diagram showing components + data flow. Use Excalidraw (free), Mermaid, or Figma. Dark background matching site theme looks best. |
| **2-4 detail screenshots** | Case study page (inline with content) | 1000px wide, WebP or PNG | Show different features/screens. Each screenshot should tell a story — not random pages. |

#### Optional but high-impact:

| Asset | Where | Spec | What to capture |
|-------|-------|------|----------------|
| **Short demo video** (30-60 sec) | Case study page — embedded or linked | MP4, 1080p, <20MB | Screen recording showing the key flow in action. No narration needed — can have captions. Host on YouTube (unlisted) and embed. |
| **Before/after comparison** | Case study page | Side-by-side images | For Scale Architecture: show "before" (timeouts/errors) vs "after" (clean dashboard). Very compelling for clients. |
| **GIF demo** | Project card hover (optional) | 600x400px, <5MB | Short animation of the project in use. Eye-catching on hover. |

#### Per-project media checklist:

**1. AI Creation Studio**
- [ ] Card thumbnail: Style picker UI or generation results grid
- [ ] Hero image: A generated product image + the generation interface side by side
- [ ] Architecture diagram: Style → Generation → Edit → Try-on → 3D/Video pipeline
- [ ] Detail screenshots: (1) Style picker with 248 styles, (2) Generation results page, (3) Virtual try-on output, (4) 3D/video output
- [ ] Optional video: 30-sec walkthrough of style → generate → try-on flow

**2. Moments Engine**
- [ ] Card thumbnail: Moments dashboard with engagement heatmap
- [ ] Hero image: YouTube video with extracted moments + merch ideas displayed
- [ ] Architecture diagram: YouTube/Instagram → Scrape → Transcript → Heatmap → Moments → Ideas → Creation Studio
- [ ] Detail screenshots: (1) Video input, (2) Engagement heatmap, (3) Extracted moments list, (4) Generated merch ideas

**3. Creator Recommender**
- [ ] Card thumbnail: Recommendation results with match scores
- [ ] Hero image: Social handle input → brand analysis → ranked style recommendations
- [ ] Architecture diagram: Handle → Scrape → Brand Analysis → Taxonomy Mapping → Ranked Recommendations (LangGraph pipeline)
- [ ] Detail screenshots: (1) Social handle input, (2) Brand analysis output, (3) Style recommendations with scores + reasoning

**4. Audience Insights**
- [ ] Card thumbnail: Mission Control bento grid with insights
- [ ] Architecture diagram: Video/Post → Comments → Analysis → SSE Stream → Bento Grid
- [ ] Detail screenshots: (1) Input screen, (2) Streaming analysis in progress, (3) Final insight grid with themes/sentiment

**5. Scale Architecture**
- [ ] Card thumbnail: Admin dashboard or observability panel
- [ ] Architecture diagram: 4-phase diagram — Event Loop → Job Queue → Async Generation → Observability
- [ ] Detail screenshots: (1) Job queue dashboard, (2) Cost tracking/usage events, (3) Admin analytics
- [ ] Optional: Before/after comparison — timeout errors vs clean async processing

**6. PrimePal**
- [ ] Card thumbnail: Student lesson interface
- [ ] Hero image: The 3-agent system in action — student interacting with tutor
- [ ] Architecture diagram: 3-agent system — Curriculum Guardrail ↔ Tutor ↔ Evaluator
- [ ] Detail screenshots: (1) Student portal, (2) Lesson/mission interface, (3) Teacher dashboard, (4) AI tutor chat
- [ ] Optional video: 30-sec walkthrough of a student completing a lesson

**7. Enterprise AI (Turing)**
- [ ] Card thumbnail: Abstract/branded image (no screenshots — NDA). Can use Turing/Meta/Apple logos with "Led LLM teams" text overlay.
- [ ] No architecture diagram needed (NDA)
- [ ] Keep this card visually branded but minimal — the credibility comes from the names (Meta, Apple, Fortune 500), not screenshots.

### 7.3 Blog Media

| Asset | Where | Spec |
|-------|-------|------|
| **Cover image per post** | Blog listing card + post header | 1200x630px, WebP or PNG. Can be abstract/branded — not required to be a screenshot. Use consistent style (e.g., dark background + cyan accent + title text). |
| **Inline images** (optional) | Within blog post body | 800px wide, WebP. Diagrams, charts, or screenshots that support the post. |

**Tip for Hasnain:** Use Figma or Canva to create consistent cover images. Pick one template (dark background + cyan accent + post title) and reuse it for every post. Brand consistency > custom art per post.

### 7.4 Image Folder Structure

```
public/
├── images/
│   ├── profile/
│   │   ├── headshot.webp           # Professional photo
│   │   └── og-default.png          # Default OG image for homepage
│   ├── projects/
│   │   ├── ai-creation-studio/
│   │   │   ├── card.webp           # 600x400 card thumbnail
│   │   │   ├── hero.webp           # 1200x700 hero image
│   │   │   ├── architecture.svg    # System diagram
│   │   │   ├── detail-1.webp       # Detail screenshot
│   │   │   ├── detail-2.webp
│   │   │   ├── detail-3.webp
│   │   │   └── detail-4.webp
│   │   ├── moments-engine/
│   │   │   └── ... (same structure)
│   │   ├── creator-recommender/
│   │   │   └── ...
│   │   ├── audience-insights/
│   │   │   └── ...
│   │   ├── scale-architecture/
│   │   │   └── ...
│   │   ├── primepal/
│   │   │   └── ...
│   │   └── enterprise-ai/
│   │       └── card.webp           # Only needs card image (NDA)
│   └── blog/
│       ├── why-ai-mvps-fail/
│       │   └── cover.webp
│       └── ... (one folder per post)
```

### 7.5 Image Format & Optimization Rules

- **Preferred format:** WebP (smaller files, great quality). PNG for diagrams/architecture. SVG for vector graphics.
- **Max file size:** Card thumbnails <100KB, hero images <300KB, detail screenshots <200KB
- **Optimization:** Use Next.js `<Image>` component — it handles responsive sizing, lazy loading, and format conversion automatically.
- **Alt text:** Every image needs descriptive alt text for accessibility and SEO. Example: `alt="AI Creation Studio generation results showing 8 product images generated from a single style"`

---

## 8. Implementation Phases — Step-by-Step Build Order

The build is broken into 5 phases. Each phase results in a deployable site. Hasnain can ship after any phase and come back for the next.

### Phase 1A: Foundation (Days 1-3)

**Goal:** Project scaffold + design system + navigation + hero deployed on Vercel.

**Tasks:**
1. Initialize Next.js 14 project with App Router
2. Set up Tailwind CSS + custom dark theme (colors, typography from Section 5)
3. Install Framer Motion + Embla Carousel
4. Build `Navbar` component (sticky, transparent → solid on scroll, mobile hamburger)
5. Build `Footer` component
6. Build `Hero` section:
   - Particle/mesh background animation
   - Large name + rotating tagline
   - Stats row with count-up animation
   - Two CTA buttons
7. Set up Vercel deployment (connect GitHub repo)
8. Deploy — live site with hero section

**Hasnain needs before Phase 1A:**
- [ ] Confirm domain (custom or GitHub Pages URL)
- [ ] No media needed yet — hero uses text + animation only

**Deliverable:** Live site at URL with hero + nav + footer.

---

### Phase 1B: Projects (Days 4-7)

**Goal:** All 7 project showcases live — carousel, grid, and case study pages.

**Tasks:**
1. Create `/content/projects/` MDX files for all 7 projects (use content guidance from Section 4.5)
2. Build `ProjectCard` component
3. Build `FilterTabs` component (All / AI Agents / Generation / Scaling / Education)
4. Build `ProjectGrid` component with filtering
5. Build `FeaturedCarousel` component (top 3 projects — large rotating cards)
6. Build case study page template at `/projects/[slug]`:
   - Problem → Approach → Architecture → Results → Tech Stack layout
   - Previous/Next project navigation
   - Contact CTA at bottom
7. Add project images to `public/images/projects/`
8. Deploy

**Hasnain needs before Phase 1B:**
- [ ] All 7 card thumbnails (600x400px) — see Section 7.2
- [ ] Hero images for top 3 featured projects (1200x700px)
- [ ] Architecture diagrams for all 7 projects (SVG or PNG)
- [ ] 2-4 detail screenshots per project
- [ ] Written case study content (drafts provided in Section 4.5 — Hasnain reviews and finalizes)
- [ ] Optional: demo videos for Creation Studio and PrimePal

---

### Phase 1C: About + Expertise + Contact (Days 8-10)

**Goal:** Complete homepage with all sections.

**Tasks:**
1. Build `ExpertiseCarousel` component (6 cards, auto-play, swipeable)
2. Build `About` section:
   - Bio with photo
   - Credentials list
   - `TechStack` visual component (grouped pills)
   - `WhyWorkWithMe` cards (4 value props)
3. Build `ContactForm` component:
   - Name, email, project description, budget range fields
   - Form validation
4. Build contact form API route (Vercel serverless → Resend email)
5. Wire up smooth scroll navigation (nav links → section anchors)
6. Add scroll-triggered animations (Framer Motion) to all sections
7. Deploy

**Hasnain needs before Phase 1C:**
- [ ] Professional headshot (800x800px minimum)
- [ ] Contact email address
- [ ] LinkedIn profile URL
- [ ] GitHub profile URL
- [ ] Review bio copy (draft in Section 4.7)
- [ ] Sign up for Resend (free tier — for contact form emails)

**Deliverable:** Complete homepage — Hero → Expertise → Projects → About → Contact. All animated, responsive, deployed.

---

### Phase 1D: Blog Platform (Days 11-14)

**Goal:** Blog listing page + blog post pages + homepage preview.

**Tasks:**
1. Set up MDX processing (next-mdx-remote or @next/mdx)
2. Create blog MDX file structure with frontmatter (title, date, category, readingTime, description)
3. Build `BlogCard` component
4. Build blog listing page at `/blog` with category filters
5. Build blog post page at `/blog/[slug]`:
   - Clean reading layout (max-width 700px)
   - Title, date, category, reading time header
   - Share buttons (Twitter/X, LinkedIn, copy link)
   - "More Posts" related section
   - Contact CTA at bottom
6. Build `BlogPreview` component for homepage (latest 3 posts)
7. Add blog cover images
8. Deploy

**Hasnain needs before Phase 1D:**
- [ ] Write first 2-3 blog posts (topic ideas in Section 4.6)
- [ ] Cover images for each post (1200x630px — use a consistent Figma/Canva template)
- [ ] Optional: inline images for posts

**Deliverable:** Full blog platform live. Homepage shows latest posts.

---

### Phase 1E: Polish & SEO (Days 15-17)

**Goal:** Production-ready site with SEO, performance, and responsive polish.

**Tasks:**
1. Add dynamic meta tags per page (title, description, OG image)
2. Create OG preview image for homepage
3. Set up next-sitemap for auto-generated sitemap
4. Test + fix responsive layout on mobile and tablet
5. Performance audit — Lighthouse 90+ target
6. Add loading states and error boundaries
7. Cross-browser testing (Chrome, Safari, Firefox, mobile)
8. Final deploy

**Hasnain needs before Phase 1E:**
- [ ] OG preview image for homepage (1200x630px — name + title on dark background)
- [ ] Custom domain configured in Vercel (if using one)

**Deliverable:** Production-ready portfolio site. Phase 1 complete.

---

### Phase 2A: RAG Chatbot (Future)

**Goal:** "Ask Hasnain" chatbot with RAG on resume + modules + blog posts.

**Tasks:**
1. Set up Vercel Postgres + pgvector (or Pinecone free tier)
2. Create embedding pipeline:
   - Chunk resume, module docs, and blog posts
   - Generate embeddings with OpenAI text-embedding-3-small
   - Store in vector database
3. Build chat API route:
   - Vercel AI SDK for streaming responses
   - Retrieval: query vector store → relevant chunks → GPT-4o-mini
   - System prompt with guardrails (professional only, deflect personal, redirect project inquiries)
4. Build chat UI:
   - Floating button (bottom-right)
   - Slide-out drawer with chat interface
   - Streaming message display
   - Suggested starter questions
5. Auto-ingest new blog posts into vector store
6. Test guardrails thoroughly
7. Deploy

**Hasnain needs before Phase 2A:**
- [ ] OpenAI API key
- [ ] Vercel Postgres setup (or Pinecone account)
- [ ] Review and approve guardrail rules
- [ ] Budget: ~$5-10/month for OpenAI API usage at moderate traffic

---

### Phase 2B: FastAPI Backend + Analytics (Future)

**Goal:** Replace Vercel API routes with dedicated FastAPI backend. Add analytics.

**Tasks:**
1. Set up FastAPI backend project
2. Migrate chatbot from Vercel API route → FastAPI endpoint
3. Implement LangChain RAG pipeline with pgvector on Supabase
4. Add analytics tracking:
   - Project page views
   - Chatbot query logs
   - Contact form submissions
   - Visitor analytics (PostHog or Vercel Analytics)
5. Deploy FastAPI on Railway/Render (free tier)
6. Update frontend to point to new backend

**Hasnain needs before Phase 2B:**
- [ ] Supabase project (for pgvector)
- [ ] Railway or Render account (for FastAPI hosting)
- [ ] PostHog account (if using for analytics)

---

## 9. Project Structure

```
hasnain-portfolio/
├── app/
│   ├── layout.tsx              # Root layout with nav + footer
│   ├── page.tsx                # Homepage (all sections)
│   ├── projects/
│   │   └── [slug]/
│   │       └── page.tsx        # Case study template
│   └── blog/
│       ├── page.tsx            # Blog listing
│       └── [slug]/
│           └── page.tsx        # Blog post
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── hero/
│   │   ├── Hero.tsx
│   │   ├── ParticleBackground.tsx
│   │   └── RotatingTagline.tsx
│   ├── expertise/
│   │   └── ExpertiseCarousel.tsx
│   ├── projects/
│   │   ├── FeaturedCarousel.tsx
│   │   ├── ProjectGrid.tsx
│   │   ├── ProjectCard.tsx
│   │   └── FilterTabs.tsx
│   ├── blog/
│   │   ├── BlogCard.tsx
│   │   └── BlogPreview.tsx
│   ├── about/
│   │   ├── About.tsx
│   │   ├── TechStack.tsx
│   │   └── WhyWorkWithMe.tsx
│   ├── contact/
│   │   └── ContactForm.tsx
│   └── chatbot/                # Phase 2
│       ├── ChatButton.tsx
│       ├── ChatDrawer.tsx
│       └── ChatMessage.tsx
├── content/
│   ├── projects/               # Project case studies (MDX)
│   │   ├── ai-creation-studio.mdx
│   │   ├── moments-engine.mdx
│   │   ├── creator-recommender.mdx
│   │   ├── audience-insights.mdx
│   │   ├── scale-architecture.mdx
│   │   ├── primepal.mdx
│   │   └── enterprise-ai.mdx
│   └── blog/                   # Blog posts (MDX)
│       └── why-ai-mvps-fail.mdx
├── lib/
│   ├── projects.ts             # Project data helpers
│   ├── blog.ts                 # Blog/MDX helpers
│   └── chatbot.ts              # Phase 2 — RAG helpers
├── public/
│   ├── images/
│   │   ├── profile/
│   │   │   ├── headshot.webp
│   │   │   └── og-default.png
│   │   ├── projects/
│   │   │   ├── ai-creation-studio/
│   │   │   │   ├── card.webp
│   │   │   │   ├── hero.webp
│   │   │   │   ├── architecture.svg
│   │   │   │   └── detail-{1,2,3,4}.webp
│   │   │   ├── moments-engine/
│   │   │   ├── creator-recommender/
│   │   │   ├── audience-insights/
│   │   │   ├── scale-architecture/
│   │   │   ├── primepal/
│   │   │   └── enterprise-ai/
│   │   └── blog/
│   │       └── {post-slug}/
│   │           └── cover.webp
│   └── favicon.ico
├── styles/
│   └── globals.css             # Tailwind + custom styles
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 10. SEO & Performance

- **Meta tags:** Dynamic per page (project title, blog post title)
- **Open Graph:** Social preview images for projects and blog posts
- **Sitemap:** Auto-generated via next-sitemap
- **Lighthouse target:** 90+ on all metrics
- **Image optimization:** Next.js `<Image>` component, WebP format, lazy loading
- **Font loading:** next/font for Inter (no layout shift)

---

## 11. Deployment

- **Platform:** Vercel
- **Domain:** Custom domain recommended (e.g., hasnainsohail.com) — GitHub Pages URL as fallback
- **Environment variables:**
  - Phase 1: `RESEND_API_KEY` (contact form email)
  - Phase 2: `OPENAI_API_KEY`, `DATABASE_URL` (Vercel Postgres for chatbot)
- **CI/CD:** Vercel auto-deploys from GitHub main branch

---

## 12. Summary — What Hasnain Needs to Prepare (By Phase)

### Before Phase 1A (Foundation):
- [ ] Confirm domain choice
- [ ] Create GitHub repo for the project

### Before Phase 1B (Projects):
- [ ] 7 card thumbnails (600x400px, WebP)
- [ ] 3 hero images for featured projects (1200x700px, WebP)
- [ ] 7 architecture diagrams (SVG preferred)
- [ ] 2-4 detail screenshots per project (1000px wide, WebP)
- [ ] Finalize all 7 case study texts (drafts in Section 4.5)
- [ ] Optional: 1-2 demo videos (30-60 sec, MP4, host on YouTube unlisted)

### Before Phase 1C (About + Contact):
- [ ] Professional headshot (800x800px, square, WebP/PNG)
- [ ] Contact email + LinkedIn + GitHub URLs
- [ ] Sign up for Resend (free tier)
- [ ] Review and finalize bio text

### Before Phase 1D (Blog):
- [ ] Write 2-3 blog posts (topic ideas in Section 4.6)
- [ ] Blog cover images (1200x630px, consistent template)

### Before Phase 1E (Polish):
- [ ] OG preview image for homepage (1200x630px)
- [ ] Custom domain configured in Vercel (if applicable)

### Before Phase 2A (Chatbot):
- [ ] OpenAI API key
- [ ] Vercel Postgres or Pinecone account
- [ ] Review chatbot guardrail rules
- [ ] Budget approval (~$5-10/month)

### Before Phase 2B (Backend + Analytics):
- [ ] Supabase project
- [ ] Railway/Render account
- [ ] PostHog account (optional)
