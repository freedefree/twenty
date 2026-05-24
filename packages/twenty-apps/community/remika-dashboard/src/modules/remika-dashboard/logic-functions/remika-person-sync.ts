import { CoreApiClient } from 'twenty-client-sdk/core';

import { toTwentyContactRoleValue } from '../constants';

export type RemikaPersonSyncInput = {
  contactId?: string | null;
  recordId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneCallingCode?: string | null;
  phoneCountryCode?: string | null;
  contactRole?: string | null;
  city?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type RemikaPersonSyncResult = {
  processed: true;
  action: 'created' | 'updated';
  recordId: string;
  personId: string;
  contactRole: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneCallingCode: string | null;
  phoneCountryCode: string | null;
  city: string | null;
  jobTitle: string | null;
  companyId: string | null;
  source: string | null;
};

export type RemikaPersonDeleteInput = Pick<
  RemikaPersonSyncInput,
  'contactId' | 'recordId' | 'source' | 'metadata'
>;

export type RemikaPersonDeleteResult =
  | {
      processed: true;
      action: 'deleted';
      recordId: string;
      personId: string;
      source: string | null;
      metadata: Record<string, unknown> | null;
    }
  | { skipped: true; reason: string };

function safeText(value: unknown): string {
  return `${value || ''}`.trim();
}

function normalizeEmail(value: unknown): string | null {
  const text = safeText(value).toLowerCase();
  return text || null;
}

function normalizePhone(value: unknown): string | null {
  const digits = safeText(value).replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.slice(-10);
}

function normalizePhoneCallingCode(value: unknown): string | null {
  const text = safeText(value);
  if (!text) return null;
  return text.startsWith('+') ? text : `+${text.replace(/^\+/, '')}`;
}

function normalizePhoneCountryCode(value: unknown): string | null {
  const text = safeText(value).toUpperCase();
  return text || null;
}

function splitNationalPhoneNumber(
  value: unknown,
  callingCode?: unknown,
): string | null {
  const digits = safeText(value).replace(/\D/g, '');
  if (!digits) return null;

  const callingDigits = safeText(callingCode).replace(/\D/g, '');
  if (callingDigits && digits.startsWith(callingDigits)) {
    const national = digits.slice(callingDigits.length);
    if (national) return national;
  }

  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.slice(-10);
}

function splitName(value: unknown) {
  const text = safeText(value);
  if (!text) return null;

  const parts = text.split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || '';
  const lastName = parts.join(' ');

  return {
    firstName,
    lastName,
  };
}

function resolveRecordId(input: RemikaPersonSyncInput) {
  const metadata = input.metadata as Record<string, any> | null | undefined;
  return (
    safeText(input.recordId) ||
    safeText(input.contactId) ||
    safeText(metadata?.recordId) ||
    safeText(metadata?.twenty?.recordId)
  );
}

function buildPersonMutationData(input: RemikaPersonSyncInput) {
  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = splitName(input.name);
    data.name = name || { firstName: '', lastName: '' };
  }

  if (input.email !== undefined) {
    data.emails = {
      primaryEmail: normalizeEmail(input.email) || '',
    };
  }

  if (input.phone !== undefined) {
    data.phones = {
      primaryPhoneNumber:
        splitNationalPhoneNumber(input.phone, input.phoneCallingCode) || '',
      ...(input.phoneCallingCode !== undefined
        ? {
            primaryPhoneCallingCode:
              normalizePhoneCallingCode(input.phoneCallingCode) || '',
          }
        : {}),
      ...(input.phoneCountryCode !== undefined
        ? {
            primaryPhoneCountryCode:
              normalizePhoneCountryCode(input.phoneCountryCode) || '',
          }
        : {}),
    };
  } else if (
    input.phoneCallingCode !== undefined ||
    input.phoneCountryCode !== undefined
  ) {
    data.phones = {
      ...(input.phoneCallingCode !== undefined
        ? {
            primaryPhoneCallingCode:
              normalizePhoneCallingCode(input.phoneCallingCode) || '',
          }
        : {}),
      ...(input.phoneCountryCode !== undefined
        ? {
            primaryPhoneCountryCode:
              normalizePhoneCountryCode(input.phoneCountryCode) || '',
          }
        : {}),
    };
  }

  if (input.contactRole !== undefined) {
    data.contactRole = toTwentyContactRoleValue(input.contactRole);
  }

  if (input.city !== undefined) {
    data.city = safeText(input.city) || '';
  }

  if (input.jobTitle !== undefined) {
    data.jobTitle = safeText(input.jobTitle) || '';
  }

  if (input.companyId !== undefined) {
    data.companyId = safeText(input.companyId) || null;
  }

  return data;
}

async function findPersonById(client: CoreApiClient, recordId: string) {
  const result = await client.query({
    people: {
      edges: {
        node: {
          id: true,
        },
      },
      __args: {
        filter: {
          id: {
            eq: recordId,
          },
        },
        first: 1,
      },
    },
  });

  return (
    (result as { people?: { edges?: Array<{ node?: { id?: string } }> } })
      .people?.edges?.[0]?.node?.id || null
  );
}

export async function deleteRemikaPersonFromTwenty(
  client: CoreApiClient,
  input: RemikaPersonDeleteInput,
): Promise<RemikaPersonDeleteResult> {
  const recordId = resolveRecordId(input);

  if (!recordId) {
    return { skipped: true, reason: 'missing recordId' };
  }

  const existingPersonId = await findPersonById(client, recordId);
  if (!existingPersonId) {
    return { skipped: true, reason: 'missing person' };
  }

  const result = await client.mutation({
    deletePerson: {
      __args: {
        id: recordId,
      },
      id: true,
      deletedAt: true,
    },
  });

  return {
    processed: true,
    action: 'deleted',
    recordId,
    personId: result?.deletePerson?.id || existingPersonId || recordId,
    source: input.source || null,
    metadata: input.metadata || null,
  };
}

export async function syncRemikaPersonToTwenty(
  client: CoreApiClient,
  input: RemikaPersonSyncInput,
): Promise<RemikaPersonSyncResult | { skipped: true; reason: string }> {
  const recordId = resolveRecordId(input);
  const nextRole = toTwentyContactRoleValue(input.contactRole);
  const nextContactRole =
    input.contactRole === undefined ? undefined : nextRole;

  if (!recordId) {
    return { skipped: true, reason: 'missing recordId' };
  }

  if (
    input.contactRole !== undefined &&
    input.contactRole !== null &&
    !nextRole
  ) {
    return { skipped: true, reason: 'invalid contactRole' };
  }

  const existingPersonId = await findPersonById(client, recordId);
  const data = buildPersonMutationData(input);

  if (existingPersonId) {
    const result = await client.mutation({
      updatePerson: {
        __args: {
          id: recordId,
          data,
        },
        id: true,
        contactRole: true,
        companyId: true,
        city: true,
        jobTitle: true,
      },
    });
    const updateContactRole = result?.updatePerson?.contactRole as
      | string
      | null
      | undefined;

    return {
      processed: true,
      action: 'updated',
      recordId,
      personId: result?.updatePerson?.id || recordId,
      contactRole: updateContactRole || nextContactRole || null,
      name: input.name !== undefined ? safeText(input.name) || null : null,
      email: input.email !== undefined ? normalizeEmail(input.email) : null,
      phone: input.phone !== undefined ? normalizePhone(input.phone) : null,
      phoneCallingCode:
        input.phoneCallingCode !== undefined
          ? normalizePhoneCallingCode(input.phoneCallingCode)
          : null,
      phoneCountryCode:
        input.phoneCountryCode !== undefined
          ? normalizePhoneCountryCode(input.phoneCountryCode)
          : null,
      city: result?.updatePerson?.city || safeText(input.city) || null,
      jobTitle:
        result?.updatePerson?.jobTitle || safeText(input.jobTitle) || null,
      companyId:
        result?.updatePerson?.companyId || safeText(input.companyId) || null,
      source: input.source || null,
    };
  }

  const result = await client.mutation({
    createPerson: {
      __args: {
        data: {
          id: recordId,
          ...data,
        },
      },
      id: true,
      contactRole: true,
      companyId: true,
      city: true,
      jobTitle: true,
    },
  });
  const createContactRole = result?.createPerson?.contactRole as
    | string
    | null
    | undefined;

  return {
    processed: true,
    action: 'created',
    recordId,
    personId: result?.createPerson?.id || recordId,
    contactRole: createContactRole || nextContactRole || null,
    name: input.name !== undefined ? safeText(input.name) || null : null,
    email: input.email !== undefined ? normalizeEmail(input.email) : null,
    phone: input.phone !== undefined ? normalizePhone(input.phone) : null,
    phoneCallingCode:
      input.phoneCallingCode !== undefined
        ? normalizePhoneCallingCode(input.phoneCallingCode)
        : null,
    phoneCountryCode:
      input.phoneCountryCode !== undefined
        ? normalizePhoneCountryCode(input.phoneCountryCode)
        : null,
    city: result?.createPerson?.city || safeText(input.city) || null,
    jobTitle:
      result?.createPerson?.jobTitle || safeText(input.jobTitle) || null,
    companyId:
      result?.createPerson?.companyId || safeText(input.companyId) || null,
    source: input.source || null,
  };
}
