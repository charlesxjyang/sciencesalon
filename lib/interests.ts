import type { OrcidWork } from "./orcid-works";
import { mapJournalToFields } from "./journal-mapping";

export interface ExtractedInterest {
  interest: string;
  weight: number;
  source: "arxiv" | "crossref" | "journal";
}

// Rate limiting helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch arXiv categories for a paper
 */
async function fetchArxivCategories(arxivId: string): Promise<string[]> {
  try {
    const response = await fetch(
      `http://export.arxiv.org/api/query?id_list=${arxivId}`
    );

    if (!response.ok) return [];

    const xml = await response.text();
    const categories: string[] = [];

    // Extract primary category
    const primaryMatch = xml.match(
      /<arxiv:primary_category[^>]*term="([^"]+)"/
    );
    if (primaryMatch) {
      categories.push(primaryMatch[1]);
    }

    // Extract all categories
    const categoryRegex = /<category[^>]*term="([^"]+)"/g;
    let match;
    while ((match = categoryRegex.exec(xml)) !== null) {
      if (!categories.includes(match[1])) {
        categories.push(match[1]);
      }
    }

    return categories;
  } catch (error) {
    console.error(`Error fetching arXiv categories for ${arxivId}:`, error);
    return [];
  }
}

/**
 * Fetch Crossref subjects for a DOI
 */
async function fetchCrossrefSubjects(doi: string): Promise<string[]> {
  try {
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: {
        "User-Agent": "Salon.Science (https://salon.science; mailto:contact@salon.science)",
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const subjects = data.message?.subject || [];

    return subjects.map((s: string) => s.toLowerCase());
  } catch (error) {
    console.error(`Error fetching Crossref subjects for ${doi}:`, error);
    return [];
  }
}

/**
 * Extract interests from a list of ORCID works
 */
export async function extractInterestsFromWorks(
  works: OrcidWork[]
): Promise<ExtractedInterest[]> {
  const interestCounts: Map<string, { count: number; source: "arxiv" | "crossref" | "journal" }> = new Map();

  // Process works with rate limiting
  for (let i = 0; i < works.length; i++) {
    const work = works[i];

    // arXiv categories (highest priority)
    if (work.arxivId) {
      // Rate limit: 1 request per 3 seconds for arXiv
      if (i > 0) await delay(3000);

      const categories = await fetchArxivCategories(work.arxivId);
      for (const category of categories) {
        const existing = interestCounts.get(category);
        if (existing) {
          existing.count++;
        } else {
          interestCounts.set(category, { count: 1, source: "arxiv" });
        }
      }
    }
    // Crossref subjects
    else if (work.doi) {
      // Rate limit for Crossref
      if (i > 0) await delay(500);

      const subjects = await fetchCrossrefSubjects(work.doi);
      for (const subject of subjects) {
        const existing = interestCounts.get(subject);
        if (existing) {
          existing.count++;
        } else {
          interestCounts.set(subject, { count: 1, source: "crossref" });
        }
      }
    }

    // Journal mapping (always try as fallback)
    if (work.journalTitle) {
      const fields = mapJournalToFields(work.journalTitle);
      for (const field of fields) {
        const existing = interestCounts.get(field);
        if (existing) {
          existing.count++;
        } else {
          interestCounts.set(field, { count: 1, source: "journal" });
        }
      }
    }
  }

  // Convert to array and calculate weights
  const interests: ExtractedInterest[] = [];
  const maxCount = Math.max(...Array.from(interestCounts.values()).map((v) => v.count), 1);

  for (const [interest, { count, source }] of interestCounts) {
    interests.push({
      interest,
      weight: count / maxCount, // Normalize to 0-1
      source,
    });
  }

  // Sort by weight and return top 15
  interests.sort((a, b) => b.weight - a.weight);
  return interests.slice(0, 15);
}
