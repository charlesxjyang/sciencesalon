export interface ArxivPaper {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  publishedDate: string;
}

/**
 * Fetch papers from arXiv RSS feed for a given category
 */
export async function fetchArxivRSS(category: string): Promise<ArxivPaper[]> {
  const response = await fetch(`http://rss.arxiv.org/rss/${category}`, {
    headers: {
      'User-Agent': 'Salon.Science Bot (https://salon.science)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch arXiv RSS for ${category}: ${response.status}`);
  }

  const xml = await response.text();
  const papers: ArxivPaper[] = [];

  // Extract items using regex
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const itemContent = itemMatch[1];

    // Extract link and arXiv ID
    const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
    const url = linkMatch?.[1] || '';
    const arxivIdMatch = url.match(/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/);
    const arxivId = arxivIdMatch?.[1] || '';

    if (!arxivId) continue;

    // Extract title (remove arXiv ID suffix like "(arXiv:2401.12345v1 [cs.AI])")
    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
    let title = titleMatch?.[1] || 'Unknown Title';
    title = title
      .replace(/\s*\(arXiv:[^)]+\)\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract authors from dc:creator
    const authorMatch = itemContent.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/);
    const authorsRaw = authorMatch?.[1] || '';
    const authors = authorsRaw
      .split(/,\s*/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    // Extract abstract from description
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
    let abstract = descMatch?.[1] || '';
    // Clean up HTML entities and tags
    abstract = abstract
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Extract published date
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
    const publishedDate = pubDateMatch?.[1] || new Date().toISOString();

    papers.push({
      arxivId,
      title,
      authors,
      abstract,
      url,
      publishedDate,
    });
  }

  return papers;
}
