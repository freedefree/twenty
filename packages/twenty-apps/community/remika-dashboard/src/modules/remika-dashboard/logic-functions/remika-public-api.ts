const DEFAULT_REMIKA_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_REMIKA_API_PUBLIC_KEY = 'dev-crm-public-api-key';

function safeText(value: unknown): string {
  return `${value || ''}`.trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function getRemikaApiBaseUrl() {
  return trimTrailingSlash(
    safeText(process.env.REMIKA_API_BASE_URL) || DEFAULT_REMIKA_API_BASE_URL,
  );
}

function getRemikaOrganizationId() {
  return safeText(process.env.REMIKA_ORGANIZATION_ID) || null;
}

function getRemikaPublicApiKey() {
  return safeText(process.env.REMIKA_API_PUBLIC_KEY) || DEFAULT_REMIKA_API_PUBLIC_KEY;
}

async function extractErrorMessage(response: Response) {
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
}

function buildRemikaRequestHeaders(options: {
  withPublicApiKey?: boolean;
  withOrganizationId?: boolean;
  headers?: HeadersInit;
}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (options.withPublicApiKey) {
    headers.set('x-crm-public-api-key', getRemikaPublicApiKey());
  }

  if (options.withOrganizationId) {
    const organizationId = getRemikaOrganizationId();
    if (organizationId) {
      headers.set('x-organization-id', organizationId);
    }
  }

  return headers;
}

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

async function requestRemikaJson<T>(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
  options: {
    method?: string;
    headers?: HeadersInit;
    body?: unknown;
    withPublicApiKey?: boolean;
    withOrganizationId?: boolean;
  } = {},
): Promise<T> {
  const headers = buildRemikaRequestHeaders({
    headers: options.headers,
    withPublicApiKey: options.withPublicApiKey,
    withOrganizationId: options.withOrganizationId,
  });

  const body =
    options.body === undefined
      ? undefined
      : typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildRemikaApiUrl(pathname, searchParams), {
    headers,
    method: options.method || 'GET',
    body,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export const fetchRemikaPublicJson = async <T>(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
): Promise<T> =>
  requestRemikaJson<T>(pathname, searchParams, {
    withPublicApiKey: true,
    withOrganizationId: true,
  });

export const postRemikaPublicJson = async <T>(
  pathname: string,
  body: unknown,
): Promise<T> =>
  requestRemikaJson<T>(pathname, undefined, {
    method: 'POST',
    body,
    withPublicApiKey: true,
    withOrganizationId: true,
  });

export const patchRemikaPublicJson = async <T>(
  pathname: string,
  body: unknown,
): Promise<T> =>
  requestRemikaJson<T>(pathname, undefined, {
    method: 'PATCH',
    body,
    withPublicApiKey: true,
    withOrganizationId: true,
  });

export type RemikaPublicContactRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  contactRole: string | null;
  source: string | null;
  companyId: string | null;
  city: string | null;
  jobTitle: string | null;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  consumerUserId: string | null;
  updatedAt: string | null;
};

export type RemikaPublicContactsListData = {
  organizationId: string;
  page: number;
  pageSize: number;
  total: number;
  rows: RemikaPublicContactRow[];
};

export const listRemikaPublicContacts = async (
  searchParams?: Record<string, string | undefined>,
): Promise<RemikaPublicContactsListData> => {
  const response = await fetchRemikaPublicJson<{
    success: boolean;
    data: RemikaPublicContactsListData;
  }>('/api/public/crm/v1/contacts', {
    organizationId: getRemikaOrganizationId() || undefined,
    ...searchParams,
  });

  return response.data;
};
