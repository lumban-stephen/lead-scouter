# Lead Scouter

**Find B2B leads. Score their site. Move fast.**

Lead Scouter is a sleek Next.js SaaS-style lead discovery app that turns a business name or website URL into a quick prospecting workflow:

- **Business search** via SERP API
- **Instant SEO / performance analysis** via PageSpeed Insights
- **Simple password gate** for private access
- **Vercel-ready** deployment with server-side API routes

## What it does

Paste a company name to discover top search results, or drop in a URL to jump straight into analysis. Lead Scouter then surfaces a fast, polished readout of a site's technical health and opportunity score.

## Features

- Premium SaaS-inspired UI
- Server-side proxy routes for third-party APIs
- Search result filtering to remove noisy domains
- PageSpeed score breakdown with recommendations
- Private dashboard access via app password

## Stack

- **Next.js 16**
- **React 19**
- **Tailwind CSS**
- **shadcn/ui**
- **Lucide React**

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local`:

```env
SERP_API_KEY=your_serp_api_key_here
PAGESPEED_API_KEY=your_pagespeed_api_key_here
APP_PASSWORD=your_secure_password
```

## Deploy on Vercel

1. Push the repo to GitHub.
2. Import it into Vercel.
3. Add the environment variables in the Vercel project settings.
4. Deploy.

No separate backend required — the API routes run on Vercel.

## Notes

- Keep `.env.local` out of git.
- `.env.example` is included as a template.
- The app is designed to feel like a lightweight SaaS product, not a generic SEO tool.
