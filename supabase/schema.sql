-- Run this in Supabase SQL Editor

-- Users table (populated from ORCID)
create table if not exists users (
  orcid_id text primary key,
  name text not null,
  bio text,
  created_at timestamp with time zone default now()
);

-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_orcid text not null references users(orcid_id) on delete cascade,
  content text not null,
  link_previews jsonb default '[]',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Paper mentions (extracted from posts)
create table if not exists paper_mentions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  identifier text not null,
  identifier_type text not null check (identifier_type in ('arxiv', 'doi')),
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
create index if not exists paper_mentions_post_idx on paper_mentions(post_id);
create index if not exists paper_mentions_identifier_idx on paper_mentions(identifier);

-- Enable Row Level Security
alter table users enable row level security;
alter table posts enable row level security;
alter table paper_mentions enable row level security;

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
