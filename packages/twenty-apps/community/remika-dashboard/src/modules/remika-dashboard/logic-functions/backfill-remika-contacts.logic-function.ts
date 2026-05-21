import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import {
  listRemikaPublicContacts,
  type RemikaPublicContactRow,
} from './remika-public-api';
import { syncRemikaPersonToTwenty } from './remika-person-sync';
import { createTwentyCoreApiClient } from './twenty-core-api-client';

type BackfillRemikaContactsPayload = {
  dryRun?: boolean;
  pageSize?: number;
  limit?: number;
};

type BackfillRowResult = {
  contactId: string;
  action: 'created' | 'updated' | 'dry_run' | 'skipped' | 'error';
  personId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  contactRole: string | null;
  city: string | null;
  jobTitle: string | null;
  reason?: string;
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function mapContactRow(row: RemikaPublicContactRow): BackfillRowResult {
  return {
    contactId: row.id,
    action: 'dry_run',
    personId: row.id,
    name: row.name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    contactRole: row.contactRole ?? null,
    city: row.city ?? null,
    jobTitle: row.jobTitle ?? null,
  };
}

const handler = async (event: RoutePayload<BackfillRemikaContactsPayload>) => {
  const body = event.body || {};
  const dryRun = Boolean(body.dryRun);
  const pageSize = clampNumber(body.pageSize, 1, 100, 100);
  const limit =
    body.limit === undefined ? null : clampNumber(body.limit, 1, Number.MAX_SAFE_INTEGER, 1);

  const firstPage = await listRemikaPublicContacts({
    page: '1',
    pageSize: `${pageSize}`,
  });

  const allContacts: RemikaPublicContactRow[] = [...firstPage.rows];
  const total = firstPage.total;

  let page = 2;
  while (allContacts.length < total) {
    if (limit !== null && allContacts.length >= limit) {
      break;
    }

    const nextPage = await listRemikaPublicContacts({
      page: `${page}`,
      pageSize: `${pageSize}`,
    });
    if (nextPage.rows.length === 0) {
      break;
    }
    allContacts.push(...nextPage.rows);
    page += 1;
  }

  const contactsToProcess =
    limit === null ? allContacts : allContacts.slice(0, Math.min(allContacts.length, limit));

  const client = dryRun ? null : createTwentyCoreApiClient();
  const rows: BackfillRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const contact of contactsToProcess) {
    const preview = mapContactRow(contact);

    if (dryRun) {
      rows.push(preview);
      skipped += 1;
      continue;
    }

    try {
      const result = await syncRemikaPersonToTwenty(client as ReturnType<typeof createTwentyCoreApiClient>, {
        contactId: contact.id,
        recordId: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        contactRole: contact.contactRole,
        city: contact.city,
        jobTitle: contact.jobTitle,
        source: contact.source,
      });

      if ('skipped' in result) {
        rows.push({
          ...preview,
          action: 'skipped',
          personId: null,
          reason: result.reason,
        });
        skipped += 1;
        continue;
      }

      rows.push({
        ...preview,
        action: result.action,
        personId: result.personId,
      });

      if (result.action === 'created') created += 1;
      if (result.action === 'updated') updated += 1;
    } catch (error) {
      errors += 1;
      rows.push({
        ...preview,
        action: 'error',
        personId: null,
        reason: error instanceof Error ? error.message : `${error}`,
      });
    }
  }

  return {
    dryRun,
    organizationId: firstPage.organizationId,
    totalContacts: total,
    processed: contactsToProcess.length,
    created,
    updated,
    skipped,
    errors,
    pageSize,
    limit,
    rows,
  };
};

export default defineLogicFunction({
  universalIdentifier: '0abf1f83-5c35-4e9f-9bc9-597f8e2f6a3d',
  name: 'backfill-remika-contacts-to-people',
  description:
    'Backfills existing Remika contacts into Twenty People using the Remika contact id as the stable People id.',
  timeoutSeconds: 120,
  handler,
  toolTriggerSettings: {
    inputSchema: {
      type: 'object',
      properties: {
        dryRun: {
          type: 'boolean',
          description: 'Return the planned actions without mutating Twenty.',
        },
        pageSize: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: 'How many Remika contacts to fetch per page.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          description: 'Stop after processing this many contacts.',
        },
      },
    },
  },
});
