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
