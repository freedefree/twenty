import { getApplicationVariable } from 'twenty-sdk/front-component';

import {
  DEFAULT_REMIKA_API_BASE_URL,
  DEFAULT_REMIKA_API_PUBLIC_KEY,
} from 'src/modules/remika-dashboard/constants';
import {
  type CrmClientActivityTargetType,
  type CrmNextActionHandoffIdentityInput,
  type CrmContactImportActionResponse,
  type CrmContactImportCandidatesResponse,
} from 'src/modules/remika-dashboard/types';
import {
  buildCrmNextActionHandoffUrl as buildSharedCrmNextActionHandoffUrl,
  buildCrmNextActionIdentityQuery,
} from '../../../../../../../../../shared/crm/next-actions';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeBrowserApiBaseUrl = (value: string) => {
  const trimmed = trimTrailingSlash(value);

  try {
    const url = new URL(trimmed);

    if (url.hostname === 'host.docker.internal') {
      url.hostname = 'localhost';
      return trimTrailingSlash(url.toString());
    }
  } catch {
    return trimmed;
  }

  return trimmed;
};

const getRemikaApiBaseUrl = () => {
  const configured = getApplicationVariable('REMIKA_API_BASE_URL');

  return normalizeBrowserApiBaseUrl(configured || DEFAULT_REMIKA_API_BASE_URL);
};

const getRemikaOrganizationId = () => {
  const configured = getApplicationVariable('REMIKA_ORGANIZATION_ID');

  return configured?.trim() || undefined;
};

const getRemikaPublicApiKey = () => {
  const configured = getApplicationVariable('REMIKA_API_PUBLIC_KEY');

  return configured?.trim() || DEFAULT_REMIKA_API_PUBLIC_KEY;
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

const buildRequestHeaders = (options: {
  withPublicApiKey?: boolean;
  withOrganizationId?: boolean;
  headers?: HeadersInit;
}) => {
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

const requestRemikaJson = async <T>(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
  options: {
    method?: string;
    headers?: HeadersInit;
    body?: unknown;
    withPublicApiKey?: boolean;
    withOrganizationId?: boolean;
  } = {},
): Promise<T> => {
  const headers = buildRequestHeaders({
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
    credentials: 'include',
    headers,
    method: options.method || 'GET',
    body,
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<T>;
};

export const fetchRemikaJson = async <T>(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
): Promise<T> => {
  return requestRemikaJson<T>(pathname, searchParams);
};

export const fetchCrmOverview = <T>() =>
  fetchRemikaJson<T>('/api/crm/overview', {
    organizationId: getRemikaOrganizationId(),
  });

export const fetchCrmNextActions = <T>(
  searchParams?: Record<string, string | undefined>,
) =>
  fetchRemikaJson<T>('/api/crm/next-actions', {
    organizationId: getRemikaOrganizationId(),
    ...searchParams,
  });

export const fetchCrmNextActionDetail = <T>(
  input: CrmNextActionHandoffIdentityInput,
  options?: {
    includeHistory?: boolean;
  },
) =>
  fetchRemikaJson<T>(
    `/api/crm/next-actions/${encodeURIComponent(input.actionId)}`,
    {
      ...buildCrmNextActionIdentityQuery(input),
      includeHistory: options?.includeHistory === false ? 'false' : 'true',
      organizationId: getRemikaOrganizationId(),
    },
  );

export const fetchCrmClientActivitySummary = <T>(input: {
  targetType: CrmClientActivityTargetType;
  targetId: string;
  window?: '24h' | '7d' | '14d' | '30d';
}) =>
  fetchRemikaJson<T>('/api/crm/client-activity', {
    organizationId: getRemikaOrganizationId(),
    targetType: input.targetType,
    targetId: input.targetId,
    window: input.window || '14d',
    includeEvidence: 'false',
    safeForTwenty: 'true',
  });

export const buildRemikaCrmHandoffUrl = (input: CrmNextActionHandoffIdentityInput) =>
  buildSharedCrmNextActionHandoffUrl(getRemikaApiBaseUrl(), input);

export const fetchCrmPublicJson = async <T>(
  pathname: string,
  searchParams?: Record<string, string | undefined>,
): Promise<T> =>
  requestRemikaJson<T>(pathname, searchParams, {
    withPublicApiKey: true,
    withOrganizationId: true,
  });

export const postCrmPublicJson = async <T>(
  pathname: string,
  body: unknown,
): Promise<T> =>
  requestRemikaJson<T>(pathname, undefined, {
    method: 'POST',
    body,
    withPublicApiKey: true,
    withOrganizationId: true,
  });

export const fetchCrmImportCandidates = <T>(
  searchParams?: Record<string, string | undefined>,
) =>
  fetchCrmPublicJson<T>('/api/public/crm/v1/contacts/import-candidates', {
    organizationId: getRemikaOrganizationId(),
    ...searchParams,
  });

export const importCrmContactFromProfile = <T>(body: unknown) =>
  postCrmPublicJson<T>('/api/public/crm/v1/contacts/import', body);
