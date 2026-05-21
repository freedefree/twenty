import { createHmac, timingSafeEqual } from 'node:crypto';

import { defineLogicFunction } from 'twenty-sdk/define';
import { type RoutePayload } from 'twenty-sdk/logic-function';

import {
  CRM_CONTACT_ROLE_VALUES,
  type CrmContactRoleValue,
} from 'src/modules/remika-dashboard/constants';
import {
  deleteRemikaPersonFromTwenty,
  syncRemikaPersonToTwenty,
} from './remika-person-sync';
import { createTwentyCoreApiClient } from './twenty-core-api-client';

type RemikaContactRoleSyncPayload = {
  contactId?: string | null;
  recordId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  phoneCallingCode?: string | null;
  phoneCountryCode?: string | null;
  contactRole?: string | null;
  action?: 'upsert' | 'delete' | null;
  companyId?: string | null;
  city?: string | null;
  jobTitle?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
};

function safeText(value: unknown): string {
  return `${value || ''}`.trim();
}

function normalizeContactRoleValue(value: unknown): CrmContactRoleValue | null {
  const text = safeText(value).toLowerCase();
  if (!text) return null;
  return CRM_CONTACT_ROLE_VALUES.includes(text as CrmContactRoleValue)
    ? (text as CrmContactRoleValue)
    : null;
}

function computeSignature(secret: string, timestamp: string, rawBody: string) {
  return createHmac('sha256', secret).update(`${timestamp}:${rawBody}`, 'utf8').digest('hex');
}

function verifySignature(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signature: string;
}) {
  const expected = computeSignature(input.secret, input.timestamp, input.rawBody);
  const provided = safeText(input.signature).replace(/^sha256=/i, '');

  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function resolveSyncSecret() {
  return (
    safeText(process.env.CONTACT_ROLE_SYNC_SECRET) ||
    safeText(process.env.CRM_WEBHOOK_SIGNING_SECRET) ||
    'dev-crm-webhook-secret'
  );
}

function resolveRecordId(body: RemikaContactRoleSyncPayload) {
  const metadata = body.metadata as Record<string, any> | null | undefined;
  return (
    safeText(body.recordId) ||
    safeText(body.contactId) ||
    safeText(metadata?.recordId) ||
    safeText(metadata?.twenty?.recordId)
  );
}

const handler = async (event: RoutePayload<RemikaContactRoleSyncPayload>) => {
  const body = event.body;
  if (!body) {
    return { skipped: true, reason: 'empty body' };
  }

  const action = safeText(body.action).toLowerCase();
  const normalizedAction =
    action === 'delete' ? 'delete' : action === '' ? 'upsert' : action === 'upsert' ? 'upsert' : null;
  const recordId = resolveRecordId(body);
  if (!recordId || !normalizedAction) {
    return {
      skipped: true,
      reason: !recordId ? 'missing recordId' : 'invalid action',
    };
  }

  const secret = resolveSyncSecret();
  const signature = event.headers?.['x-remika-sync-signature'];
  const timestamp = event.headers?.['x-remika-sync-timestamp'];
  const rawBody = event.rawBody || JSON.stringify(body);

  if (secret) {
    if (!signature || !timestamp) {
      return { error: 'missing signature' };
    }

    if (!verifySignature({ secret, timestamp, rawBody, signature })) {
      return { error: 'invalid signature' };
    }
  }

  const client = createTwentyCoreApiClient();

  if (normalizedAction === 'delete') {
    const result = await deleteRemikaPersonFromTwenty(client, {
      contactId: body.contactId || recordId,
      recordId,
      source: body.source || 'remika',
      metadata: body.metadata || null,
    });

    if ('skipped' in result) {
      return result;
    }

    return result;
  }

  const contactRole = normalizeContactRoleValue(body.contactRole);
  if (!contactRole) {
    return { skipped: true, reason: 'missing contactRole' };
  }

  const result = await syncRemikaPersonToTwenty(client, {
    contactId: body.contactId || recordId,
    recordId,
    name: body.name ?? undefined,
    email: body.email ?? undefined,
    phone: body.phone ?? undefined,
    phoneCallingCode: body.phoneCallingCode ?? undefined,
    phoneCountryCode: body.phoneCountryCode ?? undefined,
    contactRole: contactRole.toUpperCase(),
    companyId: body.companyId ?? undefined,
    city: body.city ?? undefined,
    jobTitle: body.jobTitle ?? undefined,
    source: body.source || null,
    metadata: body.metadata || null,
  });

  if ('skipped' in result) {
    return result;
  }

  return result;
};

export default defineLogicFunction({
  universalIdentifier: '1e8dcb8f-8d3e-47f8-a9df-1ef5c2bfe7e1',
  name: 'sync-remika-contact-role',
  description:
    'Receives Remika contact updates and mirrors the contact identity and profile fields back onto the matching Twenty Person record.',
  timeoutSeconds: 10,
  handler,
  httpRouteTriggerSettings: {
    path: '/remika/contact-role-sync',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-remika-sync-signature', 'x-remika-sync-timestamp'],
  },
});
