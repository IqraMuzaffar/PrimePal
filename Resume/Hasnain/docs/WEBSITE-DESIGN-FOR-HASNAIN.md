# Hasnain Sohail — Portfolio Website Design & Build Guide

**Prepared by:** Iqra
**Date:** June 2026
**Purpose:** Complete design spec + media guide + phased build plan for your portfolio website revamp. Everything you need to build it.

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [Tech Stack](#2-tech-stack)
3. [Site Architecture](#3-site-architecture)
4. [Section Specifications](#4-section-specifications)
5. [Design System](#5-design-system)
6. [Media & Asset Guide](#6-media--asset-guide)
7. [Phased Build Plan](#7-phased-build-plan)
8. [Project Structure](#8-project-structure)
9. [SEO & Performance](#9-seo--performance)
10. [Deployment](#10-deployment)
11. [Phase 2 — Future Features](#11-phase-2--future-features)

---

## 1. Overview & Goals

### What We're Building

Revamp your portfolio website (currently at okragrey.github.io/portfolio) into a premium, client-facing platform.

### Goals

- **Primary:** Attract freelance/contract clients for AI product engineering work
- **Secondary:** Establish you as a recognized AI expert and thought leader

### Target Audience

Decision-makers, startup founders, and product managers looking to hire an AI engineer. The tone is **professional and accessible** — people should know about your expertise without needing an engineering background.

### Phasing

| Phase | What | When |
|-------|------|------|
| **Phase 1** | Hero, Expertise Carousel, 7 Project Showcases, Blog (MDX), About/Credentials, Contact Hub, Design System | Build now |
| **Phase 2** | RAG Chatbot ("Ask Hasnain"), FastAPI backend upgrade, Analytics | Add later |

---

## 2. Tech Stack

### Phase 1 (Build Now)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Your stack, SSR, great DX |
| Hosting | Vercel (free tier) | Auto-deploy from GitHub, fast CDN |
| Styling | Tailwind CSS | Rapid iteration, responsive |
| Animations | Framer Motion | Smooth scroll-triggered animations |
| Blog | MDX (local files) | Write in Markdown, render as React |
| Contact Form | Vercel serverless → Resend | Free tier, reliable email delivery |
| Icons | Lucide React | Clean, consistent icon set |
| Carousel | Embla Carousel | Lightweight, accessible, touch-friendly |

### Phase 2 (Later)

| Layer | Technology |
|-------|-----------|
| Chatbot UI | Vercel AI SDK |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | Vercel Postgres + pgvector (or Pinecone) |
| LLM | GPT-4o-mini |
| Backend Upgrade | FastAPI + LangChain |
| Analytics | PostHog or Vercel Analytics |

---

## 3. Site Architecture

### Navigation Bar

```
[HASNAIN SOHAIL]     Work    Expertise    Blog    About    [Contact] (CTA button)
```

- Sticky nav, transparent on hero → solid on scroll
- Mobile: hamburger menu
- "Contact" is always a highlighted CTA button

### Pages

```
/                       → Homepage (single scrollable page with all sections)
/projects/[slug]        → Individual case study pages (7 total)
/blog                   → Blog listing page
/blog/[slug]            → Individual blog post
```

### Homepage Flow (top to bottom)

```
Hero → Expertise Carousel → Featured Projects → Project Grid → Blog Preview → About → Contact
```

---

## 4. Section Specifications

### 4.1 Hero Section

**Layout:** Full viewport height, dark background

**What's on screen:**
- Subtle animated background (particle grid or mesh gradient — keep your current site's vibe but elevated)
- "HASNAIN SOHAIL" — large, bold, white
- Rotating tagline (typewriter or fade effect):
  - "I build AI products that ship."
  - "From zero to production in 30 days."
  - "Generative. Agentic. Multimodal. Production."
- Stats row:

| Stat | Value |
|------|-------|
| Experience | 5+ Years |
| Clients | Fortune 500 |
| Speed | 30-Day MVPs |
| Delivery | Full Stack AI |

- Two CTA buttons: "See My Work" (scroll down) + "Let's Talk" (scroll to contact)
- Bottom: "Lahore, PK" + "Available 2026"

**Content note:** Tagline must be client-facing. NOT "I research diffusion models." YES "I build AI products that ship."

### 4.2 Expertise Carousel

**Layout:** Horizontal swipeable cards

**Behavior:** Auto-play (~5 sec per card), swipe on mobile, arrows on desktop, pause on hover. Use Embla Carousel.

**6 Cards:**

| # | Title | One-liner | Links to Project |
|---|-------|-----------|-----------------|
| 1 | Multi-Agent Systems | "Orchestrating AI agents that reason, decide, and act together" | Creator Recommender |
| 2 | RAG Pipelines | "Knowledge retrieval systems that give AI real context" | PrimePal |
| 3 | AI SaaS MVPs | "Zero to production AI products in under 30 days" | AI Creation Studio |
| 4 | Scalable Architecture | "Building backends that hold 1000+ concurrent users" | Scale Architecture |
| 5 | LLM Integration | "Connecting GPT-4, Claude, Gemini to production applications" | Enterprise AI |
| 6 | Multimodal AI | "Vision, language, and generation in one pipeline" | Moments Engine |

**Card design:** Abstract icon (not emoji) + Title + One-liner. Subtle gradient background. Click → linked project case study.

### 4.3 Featured Projects Carousel

**Layout:** Large rotating showcase, 3 featured projects

**Behavior:** Auto-rotate every 6 sec, navigation dots + arrows, full-width (image left / text right, stacked on mobile)

| # | Project | Headline | One-liner |
|---|---------|----------|-----------|
| 1 | AI Creation Studio | "Multi-Modal AI Generation at Scale" | "Style selection → AI generation → editing → try-on → 3D/video. 473+ generations, 248 styles, 118 models." |
| 2 | PrimePal | "AI Tutor for 50+ Pakistani Students" | "Three-agent architecture teaching English to primary school students in rural Pakistan." |
| 3 | Creator Recommender | "AI That Understands Your Brand" | "Give it a social handle — it analyzes the brand and recommends matching styles in minutes." |

Each card: project mockup/screenshot + title + headline + 3-4 tech tags + "View Case Study →" CTA

### 4.4 Project Grid

**Layout:** Filterable card grid

**Filter Tabs:** `All | AI Agents | Generation | Scaling | Education`

**7 Project Cards:**

| # | Project | Slug | Category | Card Description | Tech Tags |
|---|---------|------|----------|-----------------|-----------|
| 1 | AI Creation Studio | `ai-creation-studio` | Generation | "Built a multi-modal AI generation pipeline handling 473+ generations across flat, on-model, 3D, and video formats" | Gemini, Async, FastAPI, Next.js |
| 2 | Moments Engine | `moments-engine` | Generation | "Turn YouTube and Instagram content into product ideas — content analysis, engagement heatmaps, AI-powered ideation" | YouTube API, Whisper, Apify, Redis |
| 3 | Creator Recommender | `creator-recommender` | AI Agents | "LangGraph agent that scrapes a creator's social presence, analyzes their brand, and recommends matching styles" | LangGraph, LLM Agents, Taxonomy |
| 4 | Audience Insights | `audience-insights` | AI Agents | "Real-time comment analysis for YouTube and Instagram with streaming results — at $0.10 per post" | SSE, Streaming, Apify, Bento UI |
| 5 | Scale Architecture | `scale-architecture` | Scaling | "Took a feature-rich demo to 1000+ concurrent users — async everywhere, job queues, cost metering, 14 security audits" | SAQ, Redis, Prometheus, k6 |
| 6 | PrimePal | `primepal` | Education | "3-agent AI tutor (Curriculum Guardrail + Tutor + Evaluator) deployed for 50+ students at a Pakistani primary school" | Multi-Agent, RAG, Supabase, pgvector |
| 7 | Enterprise AI | `enterprise-ai` | AI Agents | "Led LLM teams at Turing on Meta and Apple projects — enterprise-grade AI systems for Fortune 500 clients" | LLMs, Team Lead, Enterprise |

**Card design:** Thumbnail image (top) + title + one-liner (middle) + tech tag pills (bottom). Hover: lift + glow. Click → `/projects/[slug]`

### 4.5 Case Study Pages (`/projects/[slug]`)

**Every project page follows this template:**

```
[← Back to Projects]

Project Title
One-line subtitle

─────────────────────────────────

THE PROBLEM
What challenge was being solved and why it mattered.
(2-3 paragraphs, accessible language)

THE APPROACH
How you solved it — architecture decisions, key choices.
(2-3 paragraphs + optional architecture diagram)

ARCHITECTURE
Visual diagram showing system components and data flow.
(Use Excalidraw, Mermaid, or designed SVG)

KEY RESULTS
Bullet points with measurable outcomes

TECH STACK
Visual pills grouped by layer: AI / Backend / Frontend / Infrastructure

─────────────────────────────────

[← Previous Project]    [Next Project →]
[Have a similar project? Let's talk. →]
```

**Content guide for each project — what to write:**

#### 1. AI Creation Studio
- **Problem:** Creators need product imagery but can't design. Manual process is slow and expensive.
- **Approach:** Full generation pipeline — style selection from 248 options, AI generation (Gemini), editing, virtual try-on, 3D views, video. Async batch processing for scale.
- **Key results:** 473+ generations, 248 styles, 118 models, 1,695 library images. Thread-safe Gemini singleton, chunked uploads.
- **Tone:** "I built the engine that turns a style + prompt into production-ready product imagery across every format."

#### 2. Moments Engine
- **Problem:** Creators don't know which content resonates most for merch. Manual analysis is guesswork.
- **Approach:** Automated pipeline — ingest YouTube/Instagram → transcripts (Whisper fallback) → engagement heatmaps → top moments → merch ideas → Creation Studio handoff.
- **Key results:** 45 videos, 115 moments extracted, 45 idea sets. Cache-first with TTL. Multi-source fallback chains.
- **Tone:** "I built a system that watches what audiences love and turns it into product ideas automatically."

#### 3. Creator Recommender
- **Problem:** New creators don't know which styles match their brand. Cold-start problem.
- **Approach:** LangGraph agent — scrape social → derive brand identity → map onto 91-style taxonomy → ranked recommendations with reasoning.
- **Key results:** 10 recommendations/creator, 91-style taxonomy, configurable agent, testing harness.
- **Tone:** "Give it a social handle and it understands a creator's brand in minutes."

#### 4. Audience Insights
- **Problem:** Understanding what an audience says at scale is expensive and slow.
- **Approach:** Fetch YouTube/Instagram comments → themes + sentiment + signals → stream to UI live via SSE. "Mission Control" bento grid.
- **Key results:** YouTube + Instagram live, $0.10–$0.38/post, progressive SSE rendering.
- **Tone:** "Real-time audience intelligence — streamed to your screen as the AI reads thousands of comments."

#### 5. Scale Architecture
- **Problem:** Platform worked as demo but couldn't handle real users. Timeouts, blocking, no observability.
- **Approach:** 4-phase scaling — (1) event loop unblocking (172 calls → asyncio.to_thread), (2) SAQ Redis job queue, (3) async generation (7 endpoints + 12 routes), (4) Prometheus/Grafana.
- **Key results:** 24 worker tasks, 23 job types, 1000+ concurrent users. 14 security audits. k6 load tested.
- **Tone:** "I took a demo and turned it into infrastructure that holds 1000+ users."

#### 6. PrimePal
- **Problem:** Pakistani primary school students lack quality English tutoring.
- **Approach:** Three-agent AI — Curriculum Guardrail + Tutor + Evaluator. Next.js 14 + FastAPI + Supabase + pgvector.
- **Key results:** 50+ students at The Savior School Pattoki, 2-week field study.
- **Tone:** "AI tutoring that actually works in a classroom — tested with real students in rural Pakistan."

#### 7. Enterprise AI (Turing)
- **Problem:** Fortune 500 companies need production-grade LLM systems.
- **Approach:** Led LLM teams on Meta and Apple projects. Enterprise-level quality and process.
- **Key results:** Fortune 500 delivery, team leadership, production systems.
- **Tone:** "Led AI teams building production systems for the biggest names in tech." (Keep brief — NDA)

### 4.6 Blog Platform

**Routes:** `/blog` (listing) + `/blog/[slug]` (post)

**Content storage:** MDX files in `/content/blog/` with frontmatter:

```yaml
---
title: "Why Most AI MVPs Fail"
date: "2026-07-01"
category: "AI Strategy"
readingTime: "5 min"
description: "What I've learned shipping AI products..."
---
```

**Blog listing page:** Grid of cards — title, category tag, reading time, date, 2-line excerpt. Categories: **AI Strategy** / **Building AI Products** / **Case Studies**

**Blog post page:** Clean reading layout (max-width ~700px). Title + meta at top. Share buttons (Twitter/X, LinkedIn, copy link). "More Posts" at bottom. CTA: "Want to build something like this? Let's talk."

**Homepage preview:** Latest 3 posts as cards + "Read the Blog →" link.

**Blog topics are in the separate document: `BLOG-TOPICS-FOR-HASNAIN.md`**

### 4.7 About / Credentials

**Layout:** Two-column on desktop, stacked on mobile

**Left — Bio:**
- Professional photo
- Name: Hasnain Sohail
- Title: AI Product Engineer
- Bio:
  > "I'm an AI Product Engineer with a Master's in AI from LUMS and 5+ years of experience building production AI systems. I've led LLM teams at Turing on projects for Meta and Apple, and I've shipped AI SaaS products from zero to production in under 30 days. I specialize in multi-agent systems, RAG pipelines, and full-stack AI applications. I build intelligence — and I ship it."

**Right — Credentials + Stack:**

**Credentials:**
- MS Artificial Intelligence — LUMS
- LLM Lead — Turing (Meta, Apple projects)
- AI Product Engineer — 5+ years

**Tech Stack (visual grouped pills):**

| Domain | Technologies |
|--------|-------------|
| AI / LLM | Claude, GPT-4, Gemini, LangChain, LangGraph, RAG, Pinecone, ChromaDB |
| Backend | FastAPI, Python, REST APIs, WebSockets, Redis, SAQ |
| Frontend & DB | Next.js 14, React, Tailwind CSS, Supabase, PostgreSQL, pgvector |
| Infrastructure | Vercel, Docker, Prometheus, Grafana |

**"Why Work With Me" — 4 cards:**

| Title | Copy |
|-------|------|
| Ships Fast | "AI products from zero to production in under 30 days. No endless back-and-forth — just results." |
| Enterprise-Proven | "Built AI systems for Fortune 500 companies. I know the difference between a demo and production code." |
| Full Stack, Not Just AI | "Frontend, backend, database, auth, deployment. The complete product, not just the AI layer." |
| Clean Handoff | "Every project: clean code, full documentation, walkthrough. You own it completely." |

### 4.8 Contact Hub

**Headline:** "Have an AI project? Let's talk."
**Subtext:** "I respond within 24 hours. Tell me what you're building and I'll give you an honest assessment."

**Form fields:**
- Name (required)
- Email (required)
- Project Description (textarea, required)
- Budget Range (optional dropdown: <$500 / $500-$2K / $2K-$5K / $5K+)
- Submit: "Send Message"

**Backend:** Vercel serverless → Resend email

**Below form:** Email + LinkedIn + GitHub + Location (Lahore, Pakistan)

---

## 5. Design System

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Background | #0a0a0f → #0d1117 | Page background (gradient) |
| Primary accent | #00bcd4 | CTAs, links, highlights, tags |
| Secondary accent | #f5c518 | Badges, special highlights |
| Text primary | #ffffff | Headings |
| Text secondary | #a0b4c0 | Body text, descriptions |
| Card surface | #14141f | Card backgrounds |
| Card border | #2a2a3a | Subtle card borders |

### Typography

| Element | Font | Weight | Size (desktop) |
|---------|------|--------|----------------|
| Hero name | Inter or Space Grotesk | 800 | 72-96px |
| Section headings | Inter | 700 | 32-40px |
| Card titles | Inter | 600 | 18-22px |
| Body text | Inter | 400 | 15-16px |
| Tags/labels | Inter | 600 | 11-12px, uppercase |

Use `next/font` for Inter — zero layout shift.

### Animations (Framer Motion)

| Element | Animation |
|---------|-----------|
| Hero text | Fade up on load, staggered |
| Hero background | Subtle particle/mesh (CSS or canvas) |
| Stats | Count-up on scroll into view |
| Section headings | Fade in on scroll |
| Project cards | Staggered fade up on scroll |
| Card hover | translateY -4px + border glow |
| Page transitions | Fade between routes |
| Carousels | Smooth slide with spring physics |

### Responsive

| Breakpoint | Layout |
|-----------|--------|
| Desktop (1024px+) | Full layout, horizontal carousels |
| Tablet (768-1023px) | 2-col → 1-col grids, carousels swipeable |
| Mobile (<768px) | Single column, hamburger nav, stacked cards |

---

## 6. Media & Asset Guide

### 6.1 Profile & Branding — What You Need

| Asset | Spec | Notes |
|-------|------|-------|
| **Professional headshot** | 800x800px min, square, PNG/WebP | Dark background preferred. Studio quality or well-lit portrait. No selfies. |
| **Favicon** | 32x32 ICO + 180x180 apple-touch-icon | Initials "HS" in cyan on dark. |
| **OG preview image** | 1200x630px, PNG | Name + "AI Product Engineer" on dark bg. Shows when someone shares your URL on LinkedIn/Twitter. |

### 6.2 Per-Project Media

Every project needs assets for **three places**: card thumbnail, featured carousel, and case study page.

**Required per project:**

| Asset | Where | Spec | What to Capture |
|-------|-------|------|----------------|
| **Card thumbnail** | Project grid | 600x400px, WebP | Single clean screenshot of main UI |
| **Hero image** | Featured carousel + case study header | 1200x700px, WebP | The "money shot" — most impressive view. Browser mockup frame looks great. |
| **Architecture diagram** | Case study "Architecture" section | SVG preferred (or 1200px wide PNG) | System diagram: components + data flow. Use Excalidraw (free), Mermaid, or Figma. Dark bg matching site. |
| **2-4 detail screenshots** | Case study inline content | 1000px wide, WebP | Different features/screens. Each should tell a story. |

**Optional but high-impact:**

| Asset | Where | Spec |
|-------|-------|------|
| **Short demo video** (30-60 sec) | Case study page | MP4, 1080p, <20MB. Screen recording of key flow. Host on YouTube (unlisted) and embed. |
| **Before/after comparison** | Case study (Scale Architecture) | Side-by-side: timeout errors → clean async dashboard. Very compelling. |
| **GIF demo** | Card hover (optional) | 600x400px, <5MB. Short animation of project in use. |

### 6.3 Per-Project Checklist

**1. AI Creation Studio:**
- [ ] Card: Style picker UI or generation results grid
- [ ] Hero: Generated product image + generation interface side by side
- [ ] Diagram: Style → Generation → Edit → Try-on → 3D/Video pipeline
- [ ] Details: (1) Style picker, (2) Generation results, (3) Virtual try-on, (4) 3D/video output
- [ ] Optional video: 30-sec style → generate → try-on walkthrough

**2. Moments Engine:**
- [ ] Card: Moments dashboard with engagement heatmap
- [ ] Hero: YouTube video with extracted moments + merch ideas
- [ ] Diagram: YouTube/IG → Scrape → Transcript → Heatmap → Moments → Ideas → Studio
- [ ] Details: (1) Video input, (2) Heatmap, (3) Moments list, (4) Merch ideas

**3. Creator Recommender:**
- [ ] Card: Recommendation results with match scores
- [ ] Hero: Social handle input → brand analysis → style recommendations
- [ ] Diagram: Handle → Scrape → Brand Analysis → Taxonomy → Recommendations (LangGraph)
- [ ] Details: (1) Handle input, (2) Brand analysis, (3) Recommendations with reasoning

**4. Audience Insights:**
- [ ] Card: Mission Control bento grid
- [ ] Diagram: Video/Post → Comments → Analysis → SSE Stream → Grid
- [ ] Details: (1) Input, (2) Streaming in progress, (3) Final insight grid

**5. Scale Architecture:**
- [ ] Card: Admin dashboard or observability panel
- [ ] Diagram: 4-phase — Event Loop → Job Queue → Async Gen → Observability
- [ ] Details: (1) Job queue, (2) Cost tracking, (3) Admin analytics
- [ ] Optional: Before/after comparison

**6. PrimePal:**
- [ ] Card: Student lesson interface
- [ ] Hero: 3-agent system in action
- [ ] Diagram: Curriculum Guardrail ↔ Tutor ↔ Evaluator
- [ ] Details: (1) Student portal, (2) Lesson/mission, (3) Teacher dashboard, (4) AI chat
- [ ] Optional video: 30-sec student lesson walkthrough

**7. Enterprise AI (Turing):**
- [ ] Card: Abstract/branded image with Turing/Meta/Apple logos + "Led LLM teams" overlay
- [ ] No diagram needed (NDA)
- [ ] Keep minimal — credibility comes from the names

### 6.4 Image Rules

- **Format:** WebP preferred (smaller, great quality). PNG for diagrams. SVG for vectors.
- **Max sizes:** Cards <100KB, hero <300KB, details <200KB
- **Use Next.js `<Image>`** — handles responsive sizing, lazy loading, WebP conversion
- **Alt text on every image** — accessibility + SEO. Example: `alt="AI Creation Studio generation results showing 8 product images"`

### 6.5 Image Folder Structure

```
public/images/
├── profile/
│   ├── headshot.webp
│   └── og-default.png
├── projects/
│   ├── ai-creation-studio/
│   │   ├── card.webp            # 600x400
│   │   ├── hero.webp            # 1200x700
│   │   ├── architecture.svg
│   │   ├── detail-1.webp
│   │   ├── detail-2.webp
│   │   ├── detail-3.webp
│   │   └── detail-4.webp
│   ├── moments-engine/          # same structure
│   ├── creator-recommender/
│   ├── audience-insights/
│   ├── scale-architecture/
│   ├── primepal/
│   └── enterprise-ai/
│       └── card.webp            # only card needed (NDA)
└── blog/
    └── {post-slug}/
        └── cover.webp           # 1200x630
```

---

## 7. Phased Build Plan

Each phase produces a deployable site. You can ship after any phase and come back for the next.

### Phase 1A: Foundation (Days 1-3)

**Goal:** Scaffold + design system + nav + hero — deployed on Vercel

**Tasks:**
1. `npx create-next-app@latest` with App Router
2. Set up Tailwind + custom dark theme (colors + typography from Section 5)
3. Install Framer Motion + Embla Carousel
4. Build `Navbar` (sticky, transparent → solid, mobile hamburger)
5. Build `Footer`
6. Build `Hero` (particle bg, name, rotating tagline, stats, CTAs)
7. Connect GitHub repo → Vercel, deploy

**You need:** Confirm domain choice. No media needed — hero is text + animation.

**Result:** Live site with hero + nav + footer.

---

### Phase 1B: Projects (Days 4-7)

**Goal:** All 7 project showcases — carousel, grid, case study pages

**Tasks:**
1. Create 7 MDX files in `/content/projects/` (use Section 4.5 content)
2. Build `ProjectCard`, `FilterTabs`, `ProjectGrid`
3. Build `FeaturedCarousel` (top 3 projects)
4. Build case study page template at `/projects/[slug]`
5. Add project images to `/public/images/projects/`
6. Deploy

**You need:**
- [ ] All 7 card thumbnails (600x400px)
- [ ] 3 hero images for featured projects (1200x700px)
- [ ] 7 architecture diagrams (SVG/PNG)
- [ ] 2-4 detail screenshots per project
- [ ] Finalized case study text (Section 4.5 has drafts)
- [ ] Optional: demo videos

**Result:** Full project showcase live.

---

### Phase 1C: About + Expertise + Contact (Days 8-10)

**Goal:** Complete homepage with all sections

**Tasks:**
1. Build `ExpertiseCarousel` (6 cards, auto-play)
2. Build `About` section (photo, bio, credentials, `TechStack`, `WhyWorkWithMe`)
3. Build `ContactForm` (fields + validation)
4. Build contact API route (Vercel → Resend)
5. Wire smooth scroll navigation
6. Add Framer Motion scroll animations to all sections
7. Deploy

**You need:**
- [ ] Professional headshot (800x800px)
- [ ] Contact email + LinkedIn + GitHub URLs
- [ ] Sign up for Resend (free tier)
- [ ] Review bio text (Section 4.7 has draft)

**Result:** Complete homepage — Hero → Expertise → Projects → About → Contact. Animated, responsive.

---

### Phase 1D: Blog (Days 11-14)

**Goal:** Blog platform live with first posts

**Tasks:**
1. Set up MDX (next-mdx-remote or @next/mdx)
2. Blog MDX structure with frontmatter
3. Build `BlogCard`, blog listing (`/blog`), blog post (`/blog/[slug]`)
4. Share buttons, "More Posts" section, contact CTA on posts
5. Build `BlogPreview` for homepage (latest 3)
6. Deploy

**You need:**
- [ ] 2-3 written blog posts (see `BLOG-TOPICS-FOR-HASNAIN.md`)
- [ ] Cover images per post (1200x630px — use consistent template)

**Result:** Blog live. Homepage shows latest posts.

---

### Phase 1E: Polish & SEO (Days 15-17)

**Goal:** Production-ready

**Tasks:**
1. Dynamic meta tags per page (title, description, OG image)
2. Set up next-sitemap
3. Responsive testing (mobile, tablet, desktop)
4. Performance audit — target Lighthouse 90+
5. Loading states + error boundaries
6. Cross-browser testing (Chrome, Safari, Firefox)
7. Final deploy

**You need:**
- [ ] OG preview image (1200x630px)
- [ ] Custom domain configured in Vercel (if using)

**Result:** Phase 1 complete. Production-ready portfolio.

---

## 8. Project Structure

```
hasnain-portfolio/
├── app/
│   ├── layout.tsx              # Root layout (nav + footer)
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
│   ├── projects/               # 7 project MDX files
│   └── blog/                   # Blog post MDX files
├── lib/
│   ├── projects.ts
│   ├── blog.ts
│   └── chatbot.ts              # Phase 2
├── public/
│   └── images/                 # See Section 6.5 for structure
├── styles/
│   └── globals.css
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## 9. SEO & Performance

- **Meta tags:** Dynamic per page (project titles, blog titles)
- **Open Graph:** Preview images for every page (homepage, projects, blog posts)
- **Sitemap:** Auto-generated via next-sitemap
- **Lighthouse target:** 90+ on all metrics
- **Images:** Next.js `<Image>`, WebP, lazy loading
- **Fonts:** `next/font` for Inter (no layout shift)

---

## 10. Deployment

- **Platform:** Vercel (free tier)
- **Domain:** Custom domain recommended (e.g., hasnainsohail.com). GitHub Pages URL as fallback.
- **Env vars:**
  - Phase 1: `RESEND_API_KEY` (contact form)
  - Phase 2: `OPENAI_API_KEY`, `DATABASE_URL` (chatbot)
- **CI/CD:** Vercel auto-deploys from GitHub `main` branch

---

## 11. Phase 2 — Future Features

### RAG Chatbot — "Ask Hasnain"

- **UI:** Floating chat button (bottom-right) → slide-out drawer
- **Knowledge base:** Resume + module docs + blog posts (auto-ingested as new posts publish)
- **Guardrails:**
  - Only professional questions
  - Deflects personal: "I can only answer about Hasnain's professional work."
  - Redirects projects: "Sounds like a project! Use the contact form."
  - No hallucination: "I don't have information about that."
- **Tech:** Vercel AI SDK + OpenAI embeddings + pgvector + GPT-4o-mini
- **The chatbot itself is a portfolio piece** — it proves you build RAG systems

### FastAPI Backend Upgrade

Replace Vercel API routes with FastAPI:
- LangChain for sophisticated RAG pipeline
- pgvector on Supabase
- Matches your actual tech stack (dogfooding)

### Analytics

- Project page views
- Chatbot query logs
- Contact form submissions
- PostHog or Vercel Analytics

---

## Companion Document

**Blog topics and content strategy:** See `BLOG-TOPICS-FOR-HASNAIN.md` — contains 12 curated blog topics across AI Strategy, Building AI Products, and Trending/Frontier topics (VLMs, Edge AI, SLMs), plus writing style guide and recommended publishing order.
