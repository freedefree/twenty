import { afterEach, describe, expect, it, vi } from 'vitest';

const CoreApiClient = vi.fn();

vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient,
}));

const { createTwentyCoreApiClient, resolveTwentyGraphqlUrl } = await import(
  './twenty-core-api-client'
);

describe('twenty core api client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    CoreApiClient.mockClear();
  });

  it('uses host.docker.internal by default when TWENTY_API_URL is missing', () => {
    createTwentyCoreApiClient();

    expect(CoreApiClient).toHaveBeenCalledWith({
      url: 'http://host.docker.internal:3100/graphql',
    });
  });

  it('normalizes localhost TWENTY_API_URL to host.docker.internal', () => {
    vi.stubEnv('TWENTY_API_URL', 'http://localhost:3100');

    expect(resolveTwentyGraphqlUrl()).toBe(
      'http://host.docker.internal:3100/graphql',
    );
    createTwentyCoreApiClient();

    expect(CoreApiClient).toHaveBeenCalledWith({
      url: 'http://host.docker.internal:3100/graphql',
    });
  });

  it('preserves explicit non-local graphql URLs', () => {
    vi.stubEnv('TWENTY_API_URL', 'https://example.com/workspace');

    expect(resolveTwentyGraphqlUrl()).toBe(
      'https://example.com/workspace/graphql',
    );
    createTwentyCoreApiClient();

    expect(CoreApiClient).toHaveBeenCalledWith({
      url: 'https://example.com/workspace/graphql',
    });
  });
});
