# Salon · Science

Social feed for scientists to discuss ideas before they become papers. ORCID-authenticated, paper-native (arXiv/DOI links auto-expand).

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (Postgres)
- **Auth**: ORCID OAuth (cookie-based sessions)
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Structure

```
app/
  page.tsx          # Landing
  feed/             # Main feed (authed)
  login/            # Redirects to ORCID
  auth/callback/    # OAuth callback
  auth/logout/      # Clear session
  api/posts/        # Create/list posts
  user/[orcid]/     # Profile pages
components/         # PostCard, PaperCard, PostComposer
lib/
  orcid.ts          # OAuth helpers
  papers.ts         # arXiv/DOI metadata fetching
  supabase/         # DB clients
supabase/
  schema.sql        # Run manually in Supabase SQL editor
```

## Env Vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ORCID_CLIENT_ID
ORCID_CLIENT_SECRET
NEXT_PUBLIC_APP_URL
```