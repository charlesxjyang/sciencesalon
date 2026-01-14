export interface User {
  orcid_id: string;
  name: string;
  bio: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  author_orcid: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: User;
  paper_mentions?: PaperMention[];
}

export interface PaperMention {
  id: string;
  post_id: string;
  identifier: string;
  identifier_type: 'arxiv' | 'doi';
  title: string;
  authors: string[];
  abstract: string | null;
  published_date: string | null;
  url: string;
  fetched_at: string;
}

export interface Session {
  user: User;
  accessToken: string;
}
