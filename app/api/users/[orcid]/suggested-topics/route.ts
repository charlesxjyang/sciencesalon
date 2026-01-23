import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getOrcidWorks } from "@/lib/orcid";
import { findTopicsByArxivCategory, findTopicsByKeywords, TOPICS } from "@/lib/topics";

export async function GET(
  request: NextRequest,
  { params }: { params: { orcid: string } }
) {
  const orcidId = params.orcid;

  // Don't suggest for Google users or bots
  if (orcidId.startsWith("google_") || orcidId.startsWith("bot_")) {
    return NextResponse.json({ topics: [] });
  }

  const supabase = createServiceRoleClient();
  const topicScores = new Map<string, number>();

  try {
    // First, check papers already in database
    const { data: paperMentions } = await supabase
      .from("paper_mentions")
      .select("title, abstract, arxiv_id, identifier_type, posts!inner(author_orcid)")
      .limit(100);

    const userPapers = paperMentions?.filter(
      (p) => (p.posts as any)?.author_orcid === orcidId
    ) || [];

    // Analyze papers from database
    for (const paper of userPapers) {
      // Check arXiv category if available
      if (paper.arxiv_id) {
        // arXiv IDs sometimes include category info in related URLs/identifiers
        // For now, analyze title/abstract
      }

      // Analyze title and abstract
      const textToAnalyze = `${paper.title || ""} ${paper.abstract || ""}`;
      if (textToAnalyze.trim()) {
        const matchedTopics = findTopicsByKeywords(textToAnalyze);
        for (const topic of matchedTopics.slice(0, 3)) {
          topicScores.set(topic.id, (topicScores.get(topic.id) || 0) + 1);
        }
      }
    }

    // Also fetch fresh from ORCID API if we don't have many papers
    if (userPapers.length < 5) {
      const orcidWorks = await getOrcidWorks(orcidId);

      for (const work of orcidWorks.slice(0, 20)) {
        // Analyze title
        if (work.title) {
          const matchedTopics = findTopicsByKeywords(work.title);
          for (const topic of matchedTopics.slice(0, 2)) {
            topicScores.set(topic.id, (topicScores.get(topic.id) || 0) + 1);
          }
        }

        // Check journal title for field hints
        if (work.journalTitle) {
          const journalTopics = findTopicsByKeywords(work.journalTitle);
          for (const topic of journalTopics.slice(0, 1)) {
            topicScores.set(topic.id, (topicScores.get(topic.id) || 0) + 0.5);
          }
        }
      }
    }

    // Sort by score and return top topics
    const sortedTopics = Array.from(topicScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topicId]) => topicId);

    return NextResponse.json({ topics: sortedTopics });
  } catch (error) {
    console.error("Error detecting suggested topics:", error);
    return NextResponse.json({ topics: [] });
  }
}
