# Salon · Science

A place for scientists to discuss ideas before they become papers.

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd salon-science
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Get your credentials from Settings → API

### 3. Set up ORCID

1. Register at [orcid.org/developer-tools](https://orcid.org/developer-tools)
2. Create an application
3. Set redirect URI to `https://salon.science/auth/callback` (and `http://localhost:3000/auth/callback` for dev)

### 4. Configure environment

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

The app is configured for Vercel:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Point your domain

## Features

- **ORCID authentication** — researchers only
- **Paper link expansion** — arXiv and DOI links automatically fetch metadata
- **Clean feed** — chronological posts from the community

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Postgres)
- Tailwind CSS
- ORCID OAuth

## License

MIT
