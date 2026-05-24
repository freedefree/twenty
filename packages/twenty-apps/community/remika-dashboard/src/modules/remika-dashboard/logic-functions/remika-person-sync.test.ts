import { describe, expect, it, vi } from 'vitest';

const CoreApiClient = vi.fn();

vi.mock('twenty-client-sdk/core', () => ({
  CoreApiClient,
}));

const { syncRemikaPersonToTwenty } = await import('./remika-person-sync');

describe('remika person sync', () => {
  it('maps client contact roles to BUYER when creating a person', async () => {
    const query = vi.fn(async () => ({
      people: {
        edges: [],
      },
    }));
    const mutation = vi.fn(async () => ({
      createPerson: {
        id: 'person-1',
        contactRole: 'BUYER',
        companyId: null,
        city: null,
        jobTitle: null,
      },
    }));
    const client = { query, mutation } as any;

    const result = await syncRemikaPersonToTwenty(client, {
      contactId: 'contact-1',
      recordId: 'person-1',
      name: 'Sophia Chen',
      contactRole: 'client',
      source: 'public_api',
    });

    expect(query).toHaveBeenCalledTimes(1);
    expect(mutation).toHaveBeenCalledTimes(1);

    const mutationCall = mutation.mock.calls[0]?.[0] as {
      createPerson?: {
        __args?: {
          data?: {
            contactRole?: string | null;
            id?: string;
          };
        };
      };
    };

    expect(mutationCall?.createPerson?.__args?.data?.contactRole).toBe('BUYER');
    expect(result).toEqual(
      expect.objectContaining({
        action: 'created',
        contactRole: 'BUYER',
        personId: 'person-1',
        recordId: 'person-1',
      }),
    );
  });

  it('maps unsupported contact roles to OTHER before syncing', async () => {
    const query = vi.fn(async () => ({
      people: {
        edges: [],
      },
    }));
    const mutation = vi.fn(async () => ({
      createPerson: {
        id: 'person-2',
        contactRole: 'OTHER',
        companyId: null,
        city: null,
        jobTitle: null,
      },
    }));
    const client = { query, mutation } as any;

    await syncRemikaPersonToTwenty(client, {
      contactId: 'contact-2',
      recordId: 'person-2',
      contactRole: 'title',
      source: 'public_api',
    });

    expect(mutation).toHaveBeenCalledTimes(1);

    const mutationCall = mutation.mock.calls[0]?.[0] as {
      createPerson?: {
        __args?: {
          data?: {
            contactRole?: string | null;
          };
        };
      };
    };

    expect(mutationCall?.createPerson?.__args?.data?.contactRole).toBe('OTHER');
  });
});
