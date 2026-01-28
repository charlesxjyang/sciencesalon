const ORCID_BASE_URL = 'https://orcid.org';
const ORCID_API_URL = 'https://pub.orcid.org/v3.0';

export function getOrcidAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.ORCID_CLIENT_ID!,
    response_type: 'code',
    scope: '/authenticate openid',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });

  return `${ORCID_BASE_URL}/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch(`${ORCID_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.ORCID_CLIENT_ID!,
      client_secret: process.env.ORCID_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ORCID token exchange failed: ${error}`);
  }

  return response.json();
}

export async function getOrcidProfile(orcidId: string, accessToken: string) {
  const response = await fetch(`${ORCID_API_URL}/${orcidId}/person`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  const givenNames = data.name?.['given-names']?.value || '';
  const familyName = data.name?.['family-name']?.value || '';
  const name = `${givenNames} ${familyName}`.trim() || 'Anonymous Researcher';

  return {
    orcidId,
    name,
    biography: data.biography?.content || null,
  };
}

export interface OrcidWork {
  title: string;
  doi: string | null;
  publicationDate: string | null; // ISO date string YYYY-MM-DD
  publicationYear: number | null;
  journalTitle: string | null;
  url: string | null;
  type: string | null;
}

export async function getOrcidWorks(orcidId: string): Promise<OrcidWork[]> {
  const url = `${ORCID_API_URL}/${orcidId}/works`;
  console.log("Fetching ORCID works from:", url);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch ORCID works for ${orcidId}:`, response.status, errorText);
    return [];
  }

  const data = await response.json();
  const works: OrcidWork[] = [];

  // ORCID groups works by similarity, we want unique works
  for (const group of data.group || []) {
    const workSummary = group['work-summary']?.[0];
    if (!workSummary) continue;

    const title = workSummary.title?.title?.value || 'Untitled';

    // Extract full publication date (year, month, day when available)
    const pubDate = workSummary['publication-date'];
    const year = pubDate?.year?.value;
    const month = pubDate?.month?.value;
    const day = pubDate?.day?.value;

    let publicationDate: string | null = null;
    let publicationYear: number | null = null;

    if (year) {
      publicationYear = parseInt(year);
      // Build ISO date string with available components
      const mm = month ? month.padStart(2, '0') : '01';
      const dd = day ? day.padStart(2, '0') : '01';
      publicationDate = `${year}-${mm}-${dd}`;
    }

    const journalTitle = workSummary['journal-title']?.value || null;
    const type = workSummary.type || null;

    // Extract DOI from external IDs
    let doi: string | null = null;
    let url: string | null = null;

    for (const extId of workSummary['external-ids']?.['external-id'] || []) {
      if (extId['external-id-type'] === 'doi') {
        doi = extId['external-id-value'];
        url = extId['external-id-url']?.value || `https://doi.org/${doi}`;
      }
    }

    // If no DOI but has URL, use that
    if (!url && workSummary.url?.value) {
      url = workSummary.url.value;
    }

    works.push({
      title,
      doi,
      publicationDate,
      publicationYear,
      journalTitle,
      url,
      type,
    });
  }

  // Sort by publication year (newest first)
  works.sort((a, b) => (b.publicationYear || 0) - (a.publicationYear || 0));

  return works;
}

export interface OrcidContributor {
  name: string;
  orcidId: string | null;
}

/**
 * Fetch detailed work information including contributors
 */
async function getWorkDetails(orcidId: string, putCode: string): Promise<OrcidContributor[]> {
  const url = `${ORCID_API_URL}/${orcidId}/work/${putCode}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    return [];
  }

  const work = await response.json();
  const contributors: OrcidContributor[] = [];

  for (const contributor of work.contributors?.contributor || []) {
    const creditName = contributor['credit-name']?.value;
    const contributorOrcid = contributor['contributor-orcid']?.path || null;

    if (creditName) {
      contributors.push({
        name: creditName,
        orcidId: contributorOrcid,
      });
    }
  }

  return contributors;
}

/**
 * Get co-authors from a user's ORCID works
 * Returns unique co-authors with their ORCID IDs (when available)
 */
export async function getOrcidCoAuthors(orcidId: string): Promise<OrcidContributor[]> {
  const url = `${ORCID_API_URL}/${orcidId}/works`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const coAuthorMap = new Map<string, OrcidContributor>();

  // Get put-codes for up to 20 most recent works
  const putCodes: { putCode: string; orcidId: string }[] = [];

  for (const group of (data.group || []).slice(0, 20)) {
    const workSummary = group['work-summary']?.[0];
    if (!workSummary) continue;

    const putCode = workSummary['put-code'];
    if (putCode) {
      putCodes.push({ putCode: String(putCode), orcidId });
    }
  }

  // Fetch work details in batches of 5 to avoid rate limiting
  for (let i = 0; i < putCodes.length; i += 5) {
    const batch = putCodes.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(({ putCode, orcidId }) => getWorkDetails(orcidId, putCode))
    );

    for (const contributors of results) {
      for (const contributor of contributors) {
        // Skip if this is the user themselves
        if (contributor.orcidId === orcidId) continue;

        // Use ORCID ID as key if available, otherwise use normalized name
        const key = contributor.orcidId || contributor.name.toLowerCase().trim();

        // Prefer entries with ORCID IDs
        const existing = coAuthorMap.get(key);
        if (!existing || (contributor.orcidId && !existing.orcidId)) {
          coAuthorMap.set(key, contributor);
        }
      }
    }

    // Small delay between batches to be nice to the API
    if (i + 5 < putCodes.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return Array.from(coAuthorMap.values());
}
