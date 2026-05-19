import { getApplicationVariable } from 'twenty-sdk/front-component';

import { DEFAULT_REMIKA_API_BASE_URL } from 'src/modules/remika-dashboard/constants';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getRemikaApiBaseUrl = () => {
  const configured = getApplicationVariable('REMIKA_API_BASE_URL');

  return trimTrailingSlash(configured || DEFAULT_REMIKA_API_BASE_URL);
};

const getRemikaOrganizationId = () => {
  const configured = getApplicationVariable('REMIKA_ORGANIZATION_ID');

  return configured?.trim() || undefined;
};

const extractErrorMessage = async (response: Response) => {
  const text = await response.text();

  if (!text) return `Request failed (${response.status})`;

  try {
    const json = JSON.parse(text) as {
      message?: string;
      statusMessage?: string;
      error?: string;
    };

    return (
      json.message ||
      json.statusMessage ||
      json.error ||
      `Request failed (${response.status})`
    );
  } catch {
    return text;
  }
};

export const buildRemikaApiUrl = (
  pathname: string,
  searchParams?: Record<string, string | undefined>,
) => {
  const url = new URL(pathname, `${getRemikaApiBaseUrl()}/`);

  for (const [key, value] of Object.entries(searchParams || {})) {
    if (value) url.searchParams.set(key, value);
  }

  return url.toString();
};

export const fetchRemikaJson = async <T>(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
): Promise<T> => {
  const response = await fetch(buildRemikaApiUrl(pathname, searchParams), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
};

export const fetchCrmOverview = <T>() =>
  fetchRemikaJson<T>('/api/crm/overview', {
    organizationId: getRemikaOrganizationId(),
  });

