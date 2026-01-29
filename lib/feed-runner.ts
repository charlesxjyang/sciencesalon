import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchArxivRSS } from "@/lib/arxiv-rss";

export interface FeedRunResult {
  category: string;
  newPosts: number;
  errors: string[];
}

/**
 * Run a feed to fetch and post papers from an arXiv category
 */
export async function runFeed(feedOrcid: string, category: string): Promise<FeedRunResult> {
  const supabase = createServiceRoleClient();
  const result: FeedRunResult = {
    category,
    newPosts: 0,
    errors: [],
  };

  try {
    // Fetch papers from arXiv RSS
    const papers = await fetchArxivRSS(category);
    console.log(`Fetched ${papers.length} papers for ${category}`);

    for (const paper of papers) {
      try {
        // Check if paper already posted
        const { data: existingMention } = await supabase
          .from("paper_mentions")
          .select("id")
          .eq("identifier", paper.arxivId)
          .eq("identifier_type", "arxiv")
          .single();

        if (existingMention) {
          // Paper already posted, skip
          continue;
        }

        // Create post content
        const truncatedAbstract = paper.abstract.length > 300
          ? paper.abstract.slice(0, 300) + "..."
          : paper.abstract;

        const content = `${paper.title}\n\n${truncatedAbstract}\n\nhttps://arxiv.org/abs/${paper.arxivId}`;

        // Insert post
        const { data: post, error: postError } = await supabase
          .from("posts")
          .insert({
            author_orcid: feedOrcid,
            content,
          })
          .select()
          .single();

        if (postError) {
          result.errors.push(`Failed to create post for ${paper.arxivId}: ${postError.message}`);
          continue;
        }

        // Insert paper mention
        // Generate arXiv DOI (format: 10.48550/arXiv.XXXX.XXXXX)
        const baseArxivId = paper.arxivId.replace(/v\d+$/, ''); // Strip version
        const arxivDoi = `10.48550/arXiv.${baseArxivId}`;

        const { error: mentionError } = await supabase
          .from("paper_mentions")
          .insert({
            post_id: post.id,
            identifier: paper.arxivId,
            identifier_type: "arxiv",
            arxiv_id: paper.arxivId,
            doi: arxivDoi,
            title: paper.title,
            authors: paper.authors,
            abstract: paper.abstract,
            published_date: paper.publishedDate,
            url: paper.url,
          });

        if (mentionError) {
          result.errors.push(`Failed to create paper mention for ${paper.arxivId}: ${mentionError.message}`);
          // Post was created but mention failed - still count as new post
        }

        result.newPosts++;
      } catch (paperError) {
        result.errors.push(`Error processing paper ${paper.arxivId}: ${paperError}`);
      }
    }

    // Update feed's last_fetched_at
    await supabase
      .from("users")
      .update({ feed_last_fetched_at: new Date().toISOString() })
      .eq("orcid_id", feedOrcid);

  } catch (error) {
    result.errors.push(`Failed to fetch RSS for ${category}: ${error}`);
  }

  return result;
}

/**
 * Run all feeds
 */
export async function runAllFeeds(): Promise<FeedRunResult[]> {
  const supabase = createServiceRoleClient();
  const results: FeedRunResult[] = [];

  // Fetch all feed users
  const { data: feeds, error } = await supabase
    .from("users")
    .select("orcid_id, feed_category")
    .eq("is_feed", true)
    .not("feed_category", "is", null);

  if (error) {
    throw new Error(`Failed to fetch feeds: ${error.message}`);
  }

  if (!feeds || feeds.length === 0) {
    return results;
  }

  // Run each feed
  for (const feed of feeds) {
    const result = await runFeed(feed.orcid_id, feed.feed_category!);
    results.push(result);
  }

  return results;
}
