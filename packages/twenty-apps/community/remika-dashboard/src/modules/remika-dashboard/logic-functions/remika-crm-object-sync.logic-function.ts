import { createHmac, timingSafeEqual } from 'node:crypto'

import { CoreApiClient } from 'twenty-client-sdk/core'
import { defineLogicFunction } from 'twenty-sdk/define'
import { type RoutePayload } from 'twenty-sdk/logic-function'
import { createTwentyCoreApiClient } from './twenty-core-api-client'

type RemikaCrmObjectSyncPayload = {
  objectType?: 'opportunity' | 'task' | null
  action?: 'upsert' | 'delete' | null
  recordId?: string | null
  source?: string | null
  metadata?: Record<string, unknown> | null
  data?: Record<string, unknown> | null
}

type TwentyOpportunityStage =
  | 'NEW'
  | 'SCREENING'
  | 'MEETING'
  | 'PROPOSAL'
  | 'CUSTOMER'

type TwentyTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

function safeText(value: unknown): string {
  return `${value || ''}`.trim()
}

function computeSignature(secret: string, timestamp: string, rawBody: string) {
  return createHmac('sha256', secret).update(`${timestamp}:${rawBody}`, 'utf8').digest('hex')
}

function verifySignature(input: {
  secret: string
  timestamp: string
  rawBody: string
  signature: string
}) {
  const expected = computeSignature(input.secret, input.timestamp, input.rawBody)
  const provided = safeText(input.signature).replace(/^sha256=/i, '')

  if (!expected || !provided) return false
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(provided, 'utf8')
  if (expectedBuffer.length !== providedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, providedBuffer)
}

function resolveSyncSecret() {
  return (
    safeText(process.env.CRM_OBJECT_SYNC_SECRET) ||
    safeText(process.env.CRM_WEBHOOK_SIGNING_SECRET) ||
    'dev-crm-webhook-secret'
  )
}

function resolveRecordId(body: RemikaCrmObjectSyncPayload) {
  const metadata = body.metadata as Record<string, any> | null | undefined
  return (
    safeText(body.recordId) ||
    safeText(metadata?.recordId) ||
    safeText(metadata?.twenty?.recordId)
  )
}

function normalizeOpportunityStage(value: unknown): TwentyOpportunityStage {
  const stage = safeText(value).toUpperCase()
  switch (stage) {
    case 'NEW':
    case 'BROWSING':
      return 'NEW'
    case 'SCREENING':
    case 'MEETING':
    case 'TOURING':
      return 'SCREENING'
    case 'PROPOSAL':
    case 'OFFER':
      return 'PROPOSAL'
    case 'CUSTOMER':
    case 'CLOSED':
      return 'CUSTOMER'
    default:
      return 'NEW'
  }
}

function normalizeTaskStatus(value: unknown): TwentyTaskStatus {
  const status = safeText(value).toUpperCase()
  switch (status) {
    case 'TODO':
    case 'OPEN':
      return 'TODO'
    case 'IN_PROGRESS':
    case 'SNOOZED':
      return 'IN_PROGRESS'
    case 'DONE':
    case 'CANCELED':
    case 'CANCELLED':
      return 'DONE'
    default:
      return 'TODO'
  }
}

function toRemikaOpportunityAmount(data: Record<string, unknown>) {
  const budgetMax = Number(data.budgetMax)
  const budgetMin = Number(data.budgetMin)
  const amount = Number.isFinite(budgetMax)
    ? budgetMax
    : Number.isFinite(budgetMin)
      ? budgetMin
      : null

  if (amount === null) return null

  return {
    amountMicros: Math.round(amount * 1_000_000),
    currencyCode: 'USD',
  }
}

function toOpportunityCreateData(data: Record<string, unknown>, recordId: string) {
  const stage = normalizeOpportunityStage(data.stage)
  const city = safeText(data.city)
  const type = safeText(data.type) || 'buyer'
  const contactId = safeText(data.contactId)
  const assignedAgentId = safeText(data.assignedAgentId)

  return {
    id: recordId,
    name: safeText(data.name) || [type, city].filter(Boolean).join(' - ') || 'Opportunity',
    pointOfContactId: contactId || null,
    stage,
    amount: toRemikaOpportunityAmount(data),
    ownerId: assignedAgentId || null,
  }
}

function toOpportunityUpdateData(data: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}

  if ('name' in data) patch.name = safeText(data.name) || null
  if ('contactId' in data) patch.pointOfContactId = safeText(data.contactId) || null
  if ('stage' in data) patch.stage = normalizeOpportunityStage(data.stage)
  if ('budgetMin' in data || 'budgetMax' in data) patch.amount = toRemikaOpportunityAmount(data)
  if ('assignedAgentId' in data) patch.ownerId = safeText(data.assignedAgentId) || null

  return patch
}

function toTaskCreateData(data: Record<string, unknown>, recordId: string) {
  const title = safeText(data.title) || 'Task'
  const description = safeText(data.description)
  const status = normalizeTaskStatus(data.status)
  const dueAt = safeText(data.dueAt)
  const assigneeId = safeText(data.assignedToUserId)

  return {
    id: recordId,
    title,
    bodyV2: {
      markdown: description || null,
      blocknote: null,
    },
    dueAt: dueAt || null,
    status,
    assigneeId: assigneeId || null,
  }
}

function toTaskUpdateData(data: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}

  if ('title' in data) patch.title = safeText(data.title) || null
  if ('description' in data) {
    patch.bodyV2 = {
      markdown: safeText(data.description) || null,
      blocknote: null,
    }
  }
  if ('dueAt' in data) patch.dueAt = safeText(data.dueAt) || null
  if ('status' in data) patch.status = normalizeTaskStatus(data.status)
  if ('assignedToUserId' in data) patch.assigneeId = safeText(data.assignedToUserId) || null

  return patch
}

async function findExistingRecord(
  client: CoreApiClient,
  objectType: 'opportunity' | 'task',
  recordId: string,
) {
  const result = await client.query({
    [objectType]: {
      __args: {
        filter: { id: { eq: recordId } },
      },
      id: true,
    },
  })

  return (result as Record<string, any>)[objectType] as { id?: string } | null | undefined
}

async function createOrUpdateRecord(
  client: CoreApiClient,
  objectType: 'opportunity' | 'task',
  recordId: string,
  data: Record<string, unknown>,
) {
  const existing = await findExistingRecord(client, objectType, recordId)
  const createMutationName = `create${objectType.charAt(0).toUpperCase()}${objectType.slice(1)}`
  const updateMutationName = `update${objectType.charAt(0).toUpperCase()}${objectType.slice(1)}`

  if (existing?.id) {
    if (objectType === 'opportunity') {
      await client.mutation({
        [updateMutationName]: {
          __args: {
            id: recordId,
            data: toOpportunityUpdateData(data),
          },
          id: true,
        },
      })
      return 'updated' as const
    }

    await client.mutation({
      [updateMutationName]: {
        __args: {
          id: recordId,
          data: toTaskUpdateData(data),
        },
        id: true,
      },
    })
    return 'updated' as const
  }

  if (objectType === 'opportunity') {
    await client.mutation({
      [createMutationName]: {
        __args: {
          data: toOpportunityCreateData(data, recordId),
        },
        id: true,
      },
    })
    return 'created' as const
  }

  await client.mutation({
    [createMutationName]: {
      __args: {
        data: toTaskCreateData(data, recordId),
      },
      id: true,
    },
  })
  return 'created' as const
}

const handler = async (event: RoutePayload<RemikaCrmObjectSyncPayload>) => {
  const body = event.body
  if (!body) {
    return { skipped: true, reason: 'empty body' }
  }

  const objectType = body.objectType
  const action = body.action
  const recordId = resolveRecordId(body)

  if (!objectType || !action || !recordId) {
    return {
      skipped: true,
      reason: !objectType ? 'missing objectType' : !action ? 'missing action' : 'missing recordId',
    }
  }

  const secret = resolveSyncSecret()
  const signature = event.headers?.['x-remika-sync-signature']
  const timestamp = event.headers?.['x-remika-sync-timestamp']
  const rawBody = event.rawBody || JSON.stringify(body)

  if (secret) {
    if (!signature || !timestamp) {
      return { error: 'missing signature' }
    }

    if (!verifySignature({ secret, timestamp, rawBody, signature })) {
      return { error: 'invalid signature' }
    }
  }

  if (safeText(body.source).toLowerCase() === 'twenty') {
    return { skipped: true, reason: 'twenty source' }
  }

  const client = createTwentyCoreApiClient()

  if (action === 'delete') {
    const mutationName = objectType === 'opportunity' ? 'deleteOpportunity' : 'deleteTask'
    await client.mutation({
      [mutationName]: {
        __args: { id: recordId },
        id: true,
      },
    })

    return {
      processed: true,
      recordId,
      objectType,
      action,
      source: body.source || null,
    }
  }

  const syncAction = await createOrUpdateRecord(client, objectType, recordId, body.data || {})

  return {
    processed: true,
    recordId,
    objectType,
    action: syncAction,
    source: body.source || null,
  }
}

export default defineLogicFunction({
  universalIdentifier: '8bf27a35-bd4d-4ed0-a4c7-3eb9f7f4d0f1',
  name: 'sync-remika-crm-object',
  description:
    'Receives Remika opportunity and task updates and mirrors them back onto the matching Twenty records.',
  timeoutSeconds: 10,
  handler,
  httpRouteTriggerSettings: {
    path: '/remika/crm-object-sync',
    httpMethod: 'POST',
    isAuthRequired: false,
    forwardedRequestHeaders: ['x-remika-sync-signature', 'x-remika-sync-timestamp'],
  },
})
