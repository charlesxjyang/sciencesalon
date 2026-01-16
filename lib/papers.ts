// Regex patterns for detecting paper links
// arXiv: supports /abs/, /pdf/, and arxiv: prefix
export const ARXIV_PATTERN = /(?:arxiv\.org\/(?:abs|pdf)\/|arxiv:)(\d{4}\.\d{4,5}(?:v\d+)?)/gi;
export const DOI_PATTERN = /(?:doi\.org\/|doi:)(10\.\d{4,}\/[^\s]+)/gi;
export const URL_PATTERN = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;

// Preprint server patterns (extract ID and convert to DOI or fetch metadata)
export const PREPRINT_PATTERNS: {
  name: string;
  pattern: RegExp;
  doiPrefix?: string;
  fetchUrl?: (id: string) => string;
}[] = [
  // bioRxiv: biorxiv.org/content/10.1101/2024.01.01.123456
  {
    name: 'biorxiv',
    pattern: /biorxiv\.org\/content\/(10\.1101\/[\d.]+)/gi,
  },
  // medRxiv: medrxiv.org/content/10.1101/2024.01.01.123456
  {
    name: 'medrxiv',
    pattern: /medrxiv\.org\/content\/(10\.1101\/[\d.]+)/gi,
  },
  // chemRxiv: chemrxiv.org/engage/chemrxiv/article-details/xxx
  {
    name: 'chemrxiv',
    pattern: /chemrxiv\.org\/engage\/chemrxiv\/article-details\/([a-f0-9]+)/gi,
    fetchUrl: (id: string) => `https://chemrxiv.org/engage/chemrxiv/article-details/${id}`,
  },
  // OSF Preprints: osf.io/preprints/xxx or osf.io/xxx
  {
    name: 'osf',
    pattern: /osf\.io\/(?:preprints\/\w+\/)?([a-z0-9]+)/gi,
    fetchUrl: (id: string) => `https://osf.io/${id}`,
  },
  // SSRN: ssrn.com/abstract=123456 or papers.ssrn.com/sol3/papers.cfm?abstract_id=123456
  {
    name: 'ssrn',
    pattern: /ssrn\.com\/(?:abstract=|sol3\/papers\.cfm\?abstract_id=)(\d+)/gi,
    doiPrefix: '10.2139/ssrn.',
  },
  // Research Square: researchsquare.com/article/rs-123456/v1
  {
    name: 'researchsquare',
    pattern: /researchsquare\.com\/article\/(rs-\d+)/gi,
    doiPrefix: '10.21203/rs.3.',
  },
  // Zenodo: zenodo.org/record/123456 or zenodo.org/records/123456
  {
    name: 'zenodo',
    pattern: /zenodo\.org\/records?\/(\d+)/gi,
    doiPrefix: '10.5281/zenodo.',
  },
  // EarthArXiv: eartharxiv.org/repository/view/123/
  {
    name: 'eartharxiv',
    pattern: /eartharxiv\.org\/repository\/view\/(\d+)/gi,
    fetchUrl: (id: string) => `https://eartharxiv.org/repository/view/${id}/`,
  },
  // PsyArXiv: psyarxiv.com/xxx
  {
    name: 'psyarxiv',
    pattern: /psyarxiv\.com\/([a-z0-9]+)/gi,
    doiPrefix: '10.31234/osf.io/',
  },
  // SocArXiv: osf.io/preprints/socarxiv/xxx
  {
    name: 'socarxiv',
    pattern: /osf\.io\/preprints\/socarxiv\/([a-z0-9]+)/gi,
    doiPrefix: '10.31235/osf.io/',
  },
  // engrXiv: engrxiv.org/preprint/view/xxx
  {
    name: 'engrxiv',
    pattern: /engrxiv\.org\/preprint\/view\/(\d+)/gi,
    fetchUrl: (id: string) => `https://engrxiv.org/preprint/view/${id}`,
  },
];

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

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export function extractPaperLinks(content: string): {
  arxivIds: string[];
  dois: string[];
  urls: string[];
} {
  const arxivIds: string[] = [];
  const dois: string[] = [];
  const urls: string[] = [];
  const processedDomains = new Set<string>();

  let match;

  // Extract arXiv IDs
  const arxivRegex = new RegExp(ARXIV_PATTERN.source, 'gi');
  while ((match = arxivRegex.exec(content)) !== null) {
    arxivIds.push(match[1]);
  }

  // Extract DOIs
  const doiRegex = new RegExp(DOI_PATTERN.source, 'gi');
  while ((match = doiRegex.exec(content)) !== null) {
    dois.push(match[1]);
  }

  // Extract preprint server links and convert to DOIs where possible
  for (const preprint of PREPRINT_PATTERNS) {
    const preprintRegex = new RegExp(preprint.pattern.source, 'gi');
    while ((match = preprintRegex.exec(content)) !== null) {
      const id = match[1];
      if (preprint.doiPrefix) {
        // Convert to DOI
        dois.push(preprint.doiPrefix + id);
      } else if (id.startsWith('10.')) {
        // Already a DOI (e.g., biorxiv, medrxiv)
        dois.push(id);
      }
      // Mark this domain as processed so we don't add it to generic URLs
      try {
        const urlMatch = match[0].match(/https?:\/\/([^/]+)/);
        if (urlMatch) {
          processedDomains.add(urlMatch[1].toLowerCase());
        }
      } catch {
        // Ignore parsing errors
      }
    }
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

      // Skip if already processed as a preprint server
      if ([...processedDomains].some((d) => hostname.includes(d))) {
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

interface ScrapedMetadata {
  doi?: string;
  title?: string;
  authors?: string[];
  abstract?: string;
  publishedDate?: string;
}

/**
 * Fetch and parse meta tags from a URL
 */
export async function fetchMetaTagsFromUrl(url: string): Promise<string | null> {
  const scraped = await scrapeMetadataFromUrl(url);
  return scraped?.doi || null;
}

/**
 * Scrape metadata from a publisher page using meta tags
 */
export async function scrapeMetadataFromUrl(url: string): Promise<ScrapedMetadata | null> {
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
    const result: ScrapedMetadata = {};

    // Extract DOI
    const doiPatterns = [
      /<meta[^>]*name=["']citation_doi["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']citation_doi["']/i,
      /<meta[^>]*name=["']dc\.identifier["'][^>]*content=["'](?:doi:)?(10\.[^"']+)["']/i,
      /<meta[^>]*content=["'](?:doi:)?(10\.[^"']+)["'][^>]*name=["']dc\.identifier["']/i,
      /<meta[^>]*name=["']DOI["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']DOI["']/i,
      /<meta[^>]*name=["']prism\.doi["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']og:url["'][^>]*content=["'][^"']*doi\.org\/(10\.[^"']+)["']/i,
      /<meta[^>]*name=["']bepress_citation_doi["'][^>]*content=["']([^"']+)["']/i,
    ];

    for (const pattern of doiPatterns) {
      const match = html.match(pattern);
      if (match && match[1]?.startsWith('10.')) {
        result.doi = match[1].trim();
        break;
      }
    }

    // Extract title
    const titlePatterns = [
      /<meta[^>]*name=["']citation_title["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']citation_title["']/i,
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      /<meta[^>]*name=["']dc\.title["'][^>]*content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.title = decodeHtmlEntities(match[1].trim());
        break;
      }
    }

    // Extract authors
    const authorPattern = /<meta[^>]*name=["']citation_author["'][^>]*content=["']([^"']+)["']/gi;
    const authorPattern2 = /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']citation_author["']/gi;
    const authors: string[] = [];

    let authorMatch;
    while ((authorMatch = authorPattern.exec(html)) !== null) {
      authors.push(decodeHtmlEntities(authorMatch[1].trim()));
    }
    while ((authorMatch = authorPattern2.exec(html)) !== null) {
      authors.push(decodeHtmlEntities(authorMatch[1].trim()));
    }

    if (authors.length > 0) {
      result.authors = authors;
    }

    // Extract abstract/description
    const abstractPatterns = [
      /<meta[^>]*name=["']citation_abstract["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']citation_abstract["']/i,
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
    ];

    for (const pattern of abstractPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.abstract = decodeHtmlEntities(match[1].trim());
        break;
      }
    }

    // Extract publication date
    const datePatterns = [
      /<meta[^>]*name=["']citation_publication_date["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']citation_publication_date["']/i,
      /<meta[^>]*name=["']citation_date["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']dc\.date["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i,
    ];

    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        result.publishedDate = match[1].trim();
        break;
      }
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Resolve a URL to paper metadata
 */
export async function resolveUrlToPaper(url: string): Promise<PaperMetadata | null> {
  // Fast path: try to extract DOI from URL pattern
  let doi = extractDoiFromUrl(url);
  let scrapedData: ScrapedMetadata | null = null;

  // Slow path: fetch page and look for meta tags
  if (!doi) {
    scrapedData = await scrapeMetadataFromUrl(url);
    doi = scrapedData?.doi || null;
  }

  // If we found a DOI, try Crossref first
  if (doi) {
    const crossrefMetadata = await fetchDoiMetadata(doi);
    if (crossrefMetadata) {
      return crossrefMetadata;
    }

    // Crossref failed (paper too new), use scraped data as fallback
    if (!scrapedData) {
      scrapedData = await scrapeMetadataFromUrl(url);
    }

    if (scrapedData && scrapedData.title) {
      return {
        identifier: doi,
        identifierType: 'doi',
        title: scrapedData.title,
        authors: scrapedData.authors || [],
        abstract: scrapedData.abstract || null,
        publishedDate: scrapedData.publishedDate || null,
        url: `https://doi.org/${doi}`,
      };
    }
  }

  // No DOI but we have scraped metadata with a title
  if (scrapedData && scrapedData.title) {
    // Use URL as identifier since we don't have a DOI
    return {
      identifier: url,
      identifierType: 'doi', // Treat as DOI type for display purposes
      title: scrapedData.title,
      authors: scrapedData.authors || [],
      abstract: scrapedData.abstract || null,
      publishedDate: scrapedData.publishedDate || null,
      url: url,
    };
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

/**
 * Fetch Open Graph metadata for a generic URL
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
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

    // Extract Open Graph and meta tags
    const getMetaContent = (patterns: RegExp[]): string | null => {
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          return decodeHtmlEntities(match[1].trim());
        }
      }
      return null;
    };

    const title = getMetaContent([
      /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i,
      /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']+)["']/i,
      /<title>([^<]+)<\/title>/i,
    ]);

    const description = getMetaContent([
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i,
      /<meta[^>]*name=["']twitter:description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i,
    ]);

    let imageUrl = getMetaContent([
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i,
    ]);

    // Make image URL absolute if relative
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        const baseUrl = new URL(url);
        imageUrl = new URL(imageUrl, baseUrl.origin).href;
      } catch {
        imageUrl = null;
      }
    }

    const siteName = getMetaContent([
      /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i,
    ]) || new URL(url).hostname.replace(/^www\./, '');

    // Only return if we have at least a title
    if (!title) {
      return null;
    }

    return {
      url,
      title,
      description,
      imageUrl,
      siteName,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return null;
  }
}
