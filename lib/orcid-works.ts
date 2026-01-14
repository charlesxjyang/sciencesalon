export interface OrcidWork {
  title: string;
  doi: string | null;
  arxivId: string | null;
  journalTitle: string | null;
}

interface ExternalId {
  "external-id-type": string;
  "external-id-value": string;
}

interface WorkSummary {
  title?: {
    title?: {
      value?: string;
    };
  };
  "journal-title"?: {
    value?: string;
  };
  "external-ids"?: {
    "external-id"?: ExternalId[];
  };
}

interface WorkGroup {
  "work-summary"?: WorkSummary[];
}

interface OrcidWorksResponse {
  group?: WorkGroup[];
}

/**
 * Fetch works from ORCID public API
 */
export async function fetchOrcidWorks(orcidId: string): Promise<OrcidWork[]> {
  const response = await fetch(`https://pub.orcid.org/v3.0/${orcidId}/works`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch ORCID works for ${orcidId}: ${response.status}`);
    return [];
  }

  const data: OrcidWorksResponse = await response.json();
  const works: OrcidWork[] = [];

  if (!data.group) {
    return works;
  }

  // Limit to most recent 50 works
  const groups = data.group.slice(0, 50);

  for (const group of groups) {
    const summary = group["work-summary"]?.[0];
    if (!summary) continue;

    const title = summary.title?.title?.value || "";
    if (!title) continue;

    const journalTitle = summary["journal-title"]?.value || null;
    const externalIds = summary["external-ids"]?.["external-id"] || [];

    let doi: string | null = null;
    let arxivId: string | null = null;

    for (const extId of externalIds) {
      if (extId["external-id-type"] === "doi") {
        doi = extId["external-id-value"];
      } else if (extId["external-id-type"] === "arxiv") {
        arxivId = extId["external-id-value"];
      }
    }

    works.push({
      title,
      doi,
      arxivId,
      journalTitle,
    });
  }

  return works;
}
