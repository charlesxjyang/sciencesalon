/**
 * Google Scholar scraper
 *
 * Note: Google Scholar doesn't have an official API, so we scrape the profile page.
 * This may break if Google changes their HTML structure.
 */

export interface ScholarWork {
  title: string;
  authors: string[];
  year: number | null;
  citations: number;
  url: string | null;
}

/**
 * Extract Google Scholar ID from various URL formats
 * Supported formats:
 * - https://scholar.google.com/citations?user=USERID
 * - https://scholar.google.com/citations?user=USERID&hl=en
 * - Just the user ID itself
 */
export function extractScholarId(input: string): string | null {
  if (!input) return null;

  input = input.trim();

  // If it's already just an ID (no slashes or special chars except _ and -)
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  // Try to parse as URL
  try {
    const url = new URL(input);
    const userId = url.searchParams.get('user');
    if (userId) return userId;
  } catch {
    // Not a valid URL, try regex
  }

  // Try regex for user parameter
  const match = input.match(/[?&]user=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  return null;
}

/**
 * Fetch papers from a Google Scholar profile
 */
export async function getScholarWorks(scholarId: string): Promise<ScholarWork[]> {
  const works: ScholarWork[] = [];

  // Fetch the profile page
  const url = `https://scholar.google.com/citations?user=${scholarId}&hl=en&sortby=pubdate&pagesize=100`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch Google Scholar profile: ${response.status}`);
    return [];
  }

  const html = await response.text();

  // Parse the HTML to extract papers
  // Each paper is in a <tr class="gsc_a_tr"> element
  const paperRegex = /<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g;
  let match;

  while ((match = paperRegex.exec(html)) !== null) {
    const row = match[1];

    // Extract title and link
    const titleMatch = row.match(/<a[^>]*class="gsc_a_at"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[2].trim()) : null;
    const paperPath = titleMatch ? titleMatch[1] : null;

    // Extract authors and venue (in gsc_a_b span)
    const authorsMatch = row.match(/<div class="gs_gray">([\s\S]*?)<\/div>/);
    const authorsText = authorsMatch ? decodeHtmlEntities(authorsMatch[1].trim()) : '';
    const authors = authorsText.split(',').map(a => a.trim()).filter(a => a);

    // Extract year
    const yearMatch = row.match(/<span class="gsc_a_h gsc_a_hc gs_ibl">(\d{4})<\/span>/);
    const year = yearMatch ? parseInt(yearMatch[1]) : null;

    // Extract citations
    const citationsMatch = row.match(/<a[^>]*class="gsc_a_ac[^"]*"[^>]*>(\d+)<\/a>/);
    const citations = citationsMatch ? parseInt(citationsMatch[1]) : 0;

    if (title) {
      works.push({
        title,
        authors,
        year,
        citations,
        url: paperPath ? `https://scholar.google.com${paperPath}` : null,
      });
    }
  }

  return works;
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
}

/**
 * Validate a Google Scholar profile exists
 */
export async function validateScholarProfile(scholarId: string): Promise<{ valid: boolean; name?: string }> {
  const url = `https://scholar.google.com/citations?user=${scholarId}&hl=en`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      return { valid: false };
    }

    const html = await response.text();

    // Check if profile exists by looking for the profile name
    const nameMatch = html.match(/<div id="gsc_prf_in"[^>]*>([\s\S]*?)<\/div>/);
    if (nameMatch) {
      return { valid: true, name: decodeHtmlEntities(nameMatch[1].trim()) };
    }

    // Check for "User not found" message
    if (html.includes('User not found') || html.includes('did not match any user profiles')) {
      return { valid: false };
    }

    return { valid: false };
  } catch (error) {
    console.error('Error validating Google Scholar profile:', error);
    return { valid: false };
  }
}
