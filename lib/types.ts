export interface User {
  orcid_id: string;
  name: string;
  bio: string | null;
  created_at: string;
  auth_provider?: 'orcid' | 'google';
  email?: string;
  followers_count?: number;
  following_count?: number;
  is_followed?: boolean;
  is_bot?: boolean;
  bot_category?: string | null;
  bot_last_fetched_at?: string | null;
  orcid_papers_synced_at?: string | null;
  onboarding_completed?: boolean;
}

export interface UserInterest {
  id: string;
  user_orcid: string;
  topic_id: string;
  created_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Post {
  id: string;
  author_orcid: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_orcid_import?: boolean;
  author?: User;
  paper_mentions?: PaperMention[];
  link_previews?: LinkPreview[];
  comments?: Comment[];
  comments_count?: number;
  likes_count?: number;
  user_liked?: boolean;
}

export interface Like {
  id: string;
  post_id: string;
  user_orcid: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_orcid: string;
  content: string;
  created_at: string;
  author?: User;
}

export interface PaperMention {
  id: string;
  post_id: string;
  identifier: string;
  identifier_type: 'arxiv' | 'doi';
  doi: string | null;  // DOI if available (stored for all papers)
  arxiv_id: string | null;  // arXiv ID if available
  title: string;
  authors: string[];
  abstract: string | null;
  published_date: string | null;
  url: string;
  source_url: string | null;  // Original URL if different from canonical
  fetched_at: string;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
}

export interface Session {
  user: User;
  accessToken: string;
}
