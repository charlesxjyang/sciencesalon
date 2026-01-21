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
  publicationYear: number | null;
  journalTitle: string | null;
  url: string | null;
  type: string | null;
}

export async function getOrcidWorks(orcidId: string): Promise<OrcidWork[]> {
  const response = await fetch(`${ORCID_API_URL}/${orcidId}/works`, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    console.error(`Failed to fetch ORCID works for ${orcidId}:`, response.status);
    return [];
  }

  const data = await response.json();
  const works: OrcidWork[] = [];

  // ORCID groups works by similarity, we want unique works
  for (const group of data.group || []) {
    const workSummary = group['work-summary']?.[0];
    if (!workSummary) continue;

    const title = workSummary.title?.title?.value || 'Untitled';
    const publicationYear = workSummary['publication-date']?.year?.value
      ? parseInt(workSummary['publication-date'].year.value)
      : null;
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
