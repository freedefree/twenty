import { CoreApiClient } from 'twenty-client-sdk/core';

const DEFAULT_TWENTY_GRAPHQL_URL = 'http://host.docker.internal:3100/graphql';

function safeText(value: unknown): string {
  return `${value || ''}`.trim();
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function resolveTwentyGraphqlUrl() {
  const configuredUrl = safeText(process.env.TWENTY_API_URL);

  if (!configuredUrl) {
    return DEFAULT_TWENTY_GRAPHQL_URL;
  }

  const normalizedUrl = trimTrailingSlash(configuredUrl);

  if (
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?(\/graphql)?$/i.test(
      normalizedUrl,
    )
  ) {
    return DEFAULT_TWENTY_GRAPHQL_URL;
  }

  return normalizedUrl.endsWith('/graphql')
    ? normalizedUrl
    : `${normalizedUrl}/graphql`;
}

export function createTwentyCoreApiClient() {
  return new CoreApiClient({
    url: resolveTwentyGraphqlUrl(),
  });
}
