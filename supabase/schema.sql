-- Run this in Supabase SQL Editor

-- Enable pg_trgm extension for fuzzy text search (in extensions schema per Supabase best practice)
create extension if not exists pg_trgm schema extensions;

-- Users table (populated from ORCID)
create table if not exists users (
  orcid_id text primary key,
  name text not null,
  bio text,
  orcid_papers_synced_at timestamp with time zone,
  onboarding_completed boolean default false,
  created_at timestamp with time zone default now()
);

-- Migration: Add orcid_papers_synced_at column if it doesn't exist
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS orcid_papers_synced_at timestamp with time zone;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean default false;

-- User interests (selected topics)
create table if not exists user_interests (
  id uuid primary key default gen_random_uuid(),
  user_orcid text not null references users(orcid_id) on delete cascade,
  topic_id text not null,
  created_at timestamp with time zone default now(),
  unique(user_orcid, topic_id)
);

-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_orcid text not null references users(orcid_id) on delete cascade,
  content text not null default '',
  link_previews jsonb default '[]',
  is_orcid_import boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Migration: Add is_orcid_import column if it doesn't exist
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_orcid_import boolean default false;

-- Paper mentions (extracted from posts)
create table if not exists paper_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  identifier text not null,
  identifier_type text not null check (identifier_type in ('arxiv', 'doi')),
  doi text,  -- DOI if available (stored for all papers, even arXiv)
  arxiv_id text,  -- arXiv ID if available (e.g. "2401.12345")
  title text not null,
  authors text[] default '{}',
  abstract text,
  published_date text,
  url text not null,
  source_url text,
  fetched_at timestamp with time zone default now()
);

-- Indexes for performance
create index if not exists posts_author_idx on posts(author_orcid);
create index if not exists posts_created_idx on posts(created_at desc);
create index if not exists posts_orcid_import_idx on posts(author_orcid, is_orcid_import) where is_orcid_import = true;
create index if not exists paper_mentions_post_idx on paper_mentions(post_id);
create index if not exists paper_mentions_identifier_idx on paper_mentions(identifier);
create index if not exists paper_mentions_doi_idx on paper_mentions(doi);
create index if not exists paper_mentions_arxiv_id_idx on paper_mentions(arxiv_id);
create index if not exists paper_mentions_url_idx on paper_mentions(url);
create index if not exists paper_mentions_source_url_idx on paper_mentions(source_url);

-- GIN indexes for text search (using pg_trgm from extensions schema)
create index if not exists paper_mentions_title_trgm_idx on paper_mentions using gin (title extensions.gin_trgm_ops);
create index if not exists paper_mentions_abstract_trgm_idx on paper_mentions using gin (abstract extensions.gin_trgm_ops);
create index if not exists paper_mentions_authors_gin_idx on paper_mentions using gin (authors);

-- Indexes for user_interests
create index if not exists user_interests_user_idx on user_interests(user_orcid);
create index if not exists user_interests_topic_idx on user_interests(topic_id);

-- Enable Row Level Security
alter table users enable row level security;
alter table posts enable row level security;
alter table paper_mentions enable row level security;
alter table user_interests enable row level security;

-- RLS Policies (permissive for now - anyone can read, authenticated can write)
-- For a simple cookie-based auth, we'll use service role for writes

-- Anyone can read users
create policy "Users are viewable by everyone" on users
  for select using (true);

-- Anyone can read posts  
create policy "Posts are viewable by everyone" on posts
  for select using (true);

-- Anyone can read paper mentions
create policy "Paper mentions are viewable by everyone" on paper_mentions
  for select using (true);

-- Anyone can read user interests
create policy "User interests are viewable by everyone" on user_interests
  for select using (true);

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for posts updated_at
create trigger posts_updated_at
  before update on posts
  for each row
  execute function update_updated_at();
