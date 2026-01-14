// Regex patterns for detecting paper links
export const ARXIV_PATTERN = /(?:arxiv\.org\/abs\/|arxiv:)(\d{4}\.\d{4,5}(?:v\d+)?)/gi;
export const DOI_PATTERN = /(?:doi\.org\/|doi:)(10\.\d{4,}\/[^\s]+)/gi;

export interface PaperMetadata {
  identifier: string;
  identifierType: 'arxiv' | 'doi';
  title: string;
  authors: string[];
  abstract: string | null;
  publishedDate: string | null;
  url: string;
}

export function extractPaperLinks(content: string): { arxivIds: string[]; dois: string[] } {
  const arxivIds: string[] = [];
  const dois: string[] = [];

  let match;
  
  const arxivRegex = new RegExp(ARXIV_PATTERN.source, 'gi');
  while ((match = arxivRegex.exec(content)) !== null) {
    arxivIds.push(match[1]);
  }

  const doiRegex = new RegExp(DOI_PATTERN.source, 'gi');
  while ((match = doiRegex.exec(content)) !== null) {
    dois.push(match[1]);
  }

  return { arxivIds: [...new Set(arxivIds)], dois: [...new Set(dois)] };
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
    const authors = [...authorMatches].map(m => m[1].trim());
    
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
          'Accept': 'application/json',
          'User-Agent': 'Salon.Science (https://salon.science; mailto:hello@salon.science)',
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const work = data.message;
    
    const title = work.title?.[0] || 'Unknown Title';
    const authors = (work.author || []).map((a: any) => 
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
