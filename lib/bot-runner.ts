import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchArxivRSS, ArxivPaper } from "@/lib/arxiv-rss";

export interface BotRunResult {
  category: string;
  newPosts: number;
  errors: string[];
}

/**
 * Run a bot to fetch and post papers from an arXiv category
 */
export async function runBot(botOrcid: string, category: string): Promise<BotRunResult> {
  const supabase = createServiceRoleClient();
  const result: BotRunResult = {
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
            author_orcid: botOrcid,
            content,
          })
          .select()
          .single();

        if (postError) {
          result.errors.push(`Failed to create post for ${paper.arxivId}: ${postError.message}`);
          continue;
        }

        // Insert paper mention
        const { error: mentionError } = await supabase
          .from("paper_mentions")
          .insert({
            post_id: post.id,
            identifier: paper.arxivId,
            identifier_type: "arxiv",
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

    // Update bot's last_fetched_at
    await supabase
      .from("bots")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("user_orcid", botOrcid);

  } catch (error) {
    result.errors.push(`Failed to fetch RSS for ${category}: ${error}`);
  }

  return result;
}

// Only these categories are allowed (Vercel hobby plan limits cron jobs)
const ALLOWED_CATEGORIES = ["quant-ph", "cs.RO"];

/**
 * Run all bots
 */
export async function runAllBots(): Promise<BotRunResult[]> {
  const supabase = createServiceRoleClient();
  const results: BotRunResult[] = [];

  // Fetch only bots with allowed categories
  const { data: bots, error } = await supabase
    .from("bots")
    .select("*")
    .in("category", ALLOWED_CATEGORIES);

  if (error) {
    throw new Error(`Failed to fetch bots: ${error.message}`);
  }

  if (!bots || bots.length === 0) {
    return results;
  }

  // Run each bot
  for (const bot of bots) {
    const result = await runBot(bot.user_orcid, bot.category);
    results.push(result);
  }

  return results;
}
