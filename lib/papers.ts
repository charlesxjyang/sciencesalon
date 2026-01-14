// Regex patterns for detecting paper links
export const ARXIV_PATTERN = /(?:arxiv\.org\/abs\/|arxiv:)(\d{4}\.\d{4,5}(?:v\d+)?)/gi;
export const DOI_PATTERN = /(?:doi\.org\/|doi:)(10\.\d{4,}\/[^\s]+)/gi;
export const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// Domains to skip (not papers)
const NON_PAPER_DOMAINS = [
  'twitter.com',
  'x.com',
  'youtube.com',
  'youtu.be',
  'github.com',
  'linkedin.com',
  'google.com',
  'facebook.com',
  'reddit.com',
  'instagram.com',
  'tiktok.com',
  'medium.com',
  'substack.com',
  'wikipedia.org',
  'amazon.com',
  'apple.com',
  'spotify.com',
  'discord.com',
  'slack.com',
  'notion.so',
  'figma.com',
  'dropbox.com',
  'drive.google.com',
];

// Publisher-specific DOI patterns
const PUBLISHER_DOI_PATTERNS: {
  domain: string;
  pattern: RegExp;
  prefix?: string;
}[] = [
  // Nature: nature.com/articles/s41586-024-07386-0
  { domain: 'nature.com', pattern: /\/articles\/(s\d+[-\w]+)/i, prefix: '10.1038/' },

  // Science: science.org/doi/10.1126/science.xxx
  { domain: 'science.org', pattern: /\/doi\/(10\.\d+\/[^\s?#]+)/i },

  // PNAS: pnas.org/doi/10.1073/pnas.xxx
  { domain: 'pnas.org', pattern: /\/doi\/(10\.\d+\/[^\s?#]+)/i },

  // APS journals: journals.aps.org/prl/abstract/10.1103/PhysRevLett.xxx
  { domain: 'aps.org', pattern: /(10\.1103\/[^\s?#]+)/i },

  // Wiley: onlinelibrary.wiley.com/doi/10.1002/xxx
  { domain: 'wiley.com', pattern: /\/doi\/(10\.\d+\/[^\s?#]+)/i },

  // Springer: link.springer.com/article/10.1007/xxx
  { domain: 'springer.com', pattern: /\/article\/(10\.\d+\/[^\s?#]+)/i },

  // ACS: pubs.acs.org/doi/10.1021/xxx
  { domain: 'acs.org', pattern: /\/doi\/(10\.\d+\/[^\s?#]+)/i },

  // PLoS: journals.plos.org/plosone/article?id=10.1371/xxx
  { domain: 'plos.org', pattern: /id=(10\.\d+\/[^\s?#&]+)/i },

  // biorxiv/medrxiv: biorxiv.org/content/10.1101/xxx
  { domain: 'biorxiv.org', pattern: /\/content\/(10\.\d+\/[^\s?#]+)/i },
  { domain: 'medrxiv.org', pattern: /\/content\/(10\.\d+\/[^\s?#]+)/i },

  // Cell Press: cell.com/cell/fulltext/xxx or /doi/xxx
  { domain: 'cell.com', pattern: /\/doi\/(10\.\d+\/[^\s?#]+)/i },

  // Oxford Academic: academic.oup.com/xxx/article/doi/10.1093/xxx
  { domain: 'oup.com', pattern: /\/(10\.1093\/[^\s?#]+)/i },

  // Taylor & Francis: tandfonline.com/doi/full/10.1080/xxx
  { domain: 'tandfonline.com', pattern: /\/doi\/(?:full|abs)\/(10\.\d+\/[^\s?#]+)/i },

  // PLOS: journals.plos.org with DOI in URL
  { domain: 'plos.org', pattern: /\/(10\.1371\/[^\s?#]+)/i },

  // Generic DOI in path (catches many publishers)
  { domain: '', pattern: /\/(?:doi|article|abs|full)(?:\/(?:full|abs|pdf))?\/(10\.\d+\/[^\s?#]+)/i },
];

export interface PaperMetadata {
  identifier: string;
  identifierType: 'arxiv' | 'doi';
  title: string;
  authors: string[];
  abstract: string | null;
  publishedDate: string | null;
  url: string;
}

export function extractPaperLinks(content: string): {
  arxivIds: string[];
  dois: string[];
  urls: string[];
} {
  const arxivIds: string[] = [];
  const dois: string[] = [];
  const urls: string[] = [];

  let match;

  const arxivRegex = new RegExp(ARXIV_PATTERN.source, 'gi');
  while ((match = arxivRegex.exec(content)) !== null) {
    arxivIds.push(match[1]);
  }

  const doiRegex = new RegExp(DOI_PATTERN.source, 'gi');
  while ((match = doiRegex.exec(content)) !== null) {
    dois.push(match[1]);
  }

  // Extract generic URLs
  const urlRegex = new RegExp(URL_PATTERN.source, 'gi');
  while ((match = urlRegex.exec(content)) !== null) {
    const url = match[0].replace(/[.,;:!?)]+$/, ''); // Clean trailing punctuation
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Skip non-paper domains
      if (NON_PAPER_DOMAINS.some((d) => hostname.includes(d))) {
        continue;
      }

      // Skip if already captured as arxiv or doi.org
      if (hostname.includes('arxiv.org') || hostname.includes('doi.org')) {
        continue;
      }

      urls.push(url);
    } catch {
      // Invalid URL, skip
    }
  }

  return {
    arxivIds: [...new Set(arxivIds)],
    dois: [...new Set(dois)],
    urls: [...new Set(urls)],
  };
}

/**
 * Extract DOI from a URL using known publisher patterns
 */
export function extractDoiFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const fullPath = urlObj.pathname + urlObj.search;

    // First check for generic DOI pattern in URL
    const genericDoiMatch = fullPath.match(/\/(10\.\d{4,}\/[^\s?#&/]+(?:\/[^\s?#&/]+)*)/);
    if (genericDoiMatch) {
      return decodeURIComponent(genericDoiMatch[1]);
    }

    // Check publisher-specific patterns
    for (const { domain, pattern, prefix } of PUBLISHER_DOI_PATTERNS) {
      if (domain && !hostname.includes(domain)) {
        continue;
      }

      const match = fullPath.match(pattern);
      if (match) {
        const captured = match[1];
        // If it already looks like a DOI, return it
        if (captured.startsWith('10.')) {
          return decodeURIComponent(captured);
        }
        // Otherwise prepend the prefix
        if (prefix) {
          return prefix + captured;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch meta tags from a URL to find DOI
 */
export async function fetchMetaTagsFromUrl(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Salon.Science/1.0; +https://salon.science)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Try various meta tag patterns for DOI
    const metaPatterns = [
      // citation_doi
      /<meta[^>]*name=["']citation_doi["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']citation_doi["']/i,

      // dc.identifier with DOI
      /<meta[^>]*name=["']dc\.identifier["'][^>]*content=["'](?:doi:)?(10\.[^"']+)["']/i,
      /<meta[^>]*content=["'](?:doi:)?(10\.[^"']+)["'][^>]*name=["']dc\.identifier["']/i,

      // DOI meta tag
      /<meta[^>]*name=["']DOI["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']DOI["']/i,

      // prism.doi
      /<meta[^>]*name=["']prism\.doi["'][^>]*content=["']([^"']+)["']/i,

      // og:url containing doi.org
      /<meta[^>]*property=["']og:url["'][^>]*content=["'][^"']*doi\.org\/(10\.[^"']+)["']/i,

      // bepress_citation_doi
      /<meta[^>]*name=["']bepress_citation_doi["'][^>]*content=["']([^"']+)["']/i,
    ];

    for (const pattern of metaPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const doi = match[1].trim();
        // Validate it looks like a DOI
        if (doi.startsWith('10.')) {
          return doi;
        }
      }
    }

    return null;
  } catch (error) {
    clearTimeout(timeoutId);
    // Timeout or network error - fail silently
    return null;
  }
}

/**
 * Resolve a URL to paper metadata
 */
export async function resolveUrlToPaper(url: string): Promise<PaperMetadata | null> {
  // Fast path: try to extract DOI from URL pattern
  let doi = extractDoiFromUrl(url);

  // Slow path: fetch page and look for meta tags
  if (!doi) {
    doi = await fetchMetaTagsFromUrl(url);
  }

  // If we found a DOI, fetch metadata
  if (doi) {
    return fetchDoiMetadata(doi);
  }

  return null;
}

export async function fetchArxivMetadata(arxivId: string): Promise<PaperMetadata | null> {
  try {
    const response = await fetch(
      `https://export.arxiv.org/api/query?id_list=${arxivId}`
    );

    if (!response.ok) return null;

    const xml = await response.text();

    // Parse XML response
    const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/g);
    const title = titleMatch?.[1]
      ?.replace(/<\/?title>/g, '')
      ?.replace(/\s+/g, ' ')
      ?.trim() || 'Unknown Title';

    const authorMatches = xml.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g);
    const authors = [...authorMatches].map((m) => m[1].trim());

    const summaryMatch = xml.match(/<summary>([\s\S]*?)<\/summary>/);
    const abstract = summaryMatch?.[1]?.replace(/\s+/g, ' ')?.trim() || null;

    const publishedMatch = xml.match(/<published>([\s\S]*?)<\/published>/);
    const publishedDate = publishedMatch?.[1]?.trim() || null;

    return {
      identifier: arxivId,
      identifierType: 'arxiv',
      title,
      authors,
      abstract,
      publishedDate,
      url: `https://arxiv.org/abs/${arxivId}`,
    };
  } catch (error) {
    console.error('Error fetching arXiv metadata:', error);
    return null;
  }
}

export async function fetchDoiMetadata(doi: string): Promise<PaperMetadata | null> {
  try {
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Salon.Science (https://salon.science; mailto:hello@salon.science)',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const work = data.message;

    const title = work.title?.[0] || 'Unknown Title';
    const authors = (work.author || []).map(
      (a: { given?: string; family?: string }) =>
        `${a.given || ''} ${a.family || ''}`.trim()
    );
    const abstract = work.abstract?.replace(/<[^>]*>/g, '') || null;
    const publishedDate = work.published?.['date-parts']?.[0]?.join('-') || null;

    return {
      identifier: doi,
      identifierType: 'doi',
      title,
      authors,
      abstract,
      publishedDate,
      url: `https://doi.org/${doi}`,
    };
  } catch (error) {
    console.error('Error fetching DOI metadata:', error);
    return null;
  }
}

export async function fetchPaperMetadata(
  identifier: string,
  type: 'arxiv' | 'doi'
): Promise<PaperMetadata | null> {
  if (type === 'arxiv') {
    return fetchArxivMetadata(identifier);
  } else {
    return fetchDoiMetadata(identifier);
  }
}
