import { v5 as uuidv5 } from 'uuid';
import { FieldActorSource } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { type DataSource } from 'typeorm';

import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { type WebhookService } from 'src/engine/metadata-modules/webhook/webhook.service';
import { generateFakeObjectRecordEvent } from 'src/modules/workflow/workflow-builder/workflow-schema/utils/generate-fake-object-record-event';

type BridgeAction = 'UPSERTED' | 'DELETED';

type BridgeObjectName =
  | 'person'
  | 'opportunity'
  | 'task'
  | 'dashboard'
  | 'timelineActivity';

type BridgeBodyContext = {
  triggerId: string;
  workspaceId: string;
  objectName: BridgeObjectName;
  action: BridgeAction;
};

type BridgeObjectConfig = {
  objectName: BridgeObjectName;
  remikaResource:
    | 'contacts'
    | 'opportunities'
    | 'tasks'
    | 'dashboards'
    | 'activities';
  bridgeLabel: string;
  upsertPath: string;
  deletePath: string;
  buildUpsertBody: (ctx: BridgeBodyContext) => Record<string, unknown>;
  buildWebhookPayload?: (ctx: BridgeBodyContext) => Record<string, unknown>;
};

const REMIKA_BRIDGE_ID_NAMESPACE = 'b1e0d4a3-2d4d-4c7b-9b43-8d38d3fb119d';

const REMIKA_BRIDGE_WEBHOOK_DESCRIPTION = 'Remika CRM timeline / signal bridge';

function jsonStringify(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

function normalizeRemikaOpportunityStage(value: unknown): string {
  const stage = `${value || ''}`.trim().toUpperCase();
  switch (stage) {
    case 'NEW':
    case 'BROWSING':
      return 'browsing';
    case 'SCREENING':
    case 'MEETING':
    case 'TOURING':
      return 'touring';
    case 'PROPOSAL':
    case 'OFFER':
      return 'offer';
    case 'CUSTOMER':
    case 'CLOSED':
      return 'closed';
    default:
      return 'browsing';
  }
}

function normalizeRemikaTaskStatus(value: unknown): string {
  const status = `${value || ''}`.trim().toUpperCase();
  switch (status) {
    case 'TODO':
    case 'OPEN':
      return 'open';
    case 'IN_PROGRESS':
    case 'SNOOZED':
      return 'snoozed';
    case 'DONE':
      return 'done';
    case 'CANCELED':
    case 'CANCELLED':
      return 'canceled';
    default:
      return 'open';
  }
}

function buildBridgeDeleteBody({
  triggerId,
  workspaceId,
  objectName,
  action,
}: BridgeBodyContext): Record<string, unknown> {
  return {
    source: 'twenty',
    recordId: `{{${triggerId}.properties.before.id}}`,
    metadata: {
      source: 'twenty',
      workspaceId,
      objectName,
      eventType: `${objectName}.${action.toLowerCase()}`,
      recordId: `{{${triggerId}.properties.before.id}}`,
    },
  }
}

function getBridgeIds(
  workspaceId: string,
  objectName: string,
  action: BridgeAction,
) {
  const base = `${workspaceId}:remika-bridge:${objectName}:${action}`;
  return {
    workflowId: uuidv5(`${base}:workflow`, REMIKA_BRIDGE_ID_NAMESPACE),
    workflowVersionId: uuidv5(
      `${base}:workflow-version`,
      REMIKA_BRIDGE_ID_NAMESPACE,
    ),
    automatedTriggerId: uuidv5(
      `${base}:workflow-trigger`,
      REMIKA_BRIDGE_ID_NAMESPACE,
    ),
    workflowName: `${objectName}.${action.toLowerCase()} -> Remika`,
  };
}

function buildWorkflowHttpRequestStep({
  id,
  name,
  method,
  url,
  headers,
  body,
  nextStepIds,
}: {
  id: string;
  name: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown> | string;
  nextStepIds?: string[] | null;
}) {
  return {
    id,
    name,
    type: 'HTTP_REQUEST',
    valid: false,
    nextStepIds: nextStepIds || null,
    settings: {
      outputSchema: {},
      errorHandlingOptions: {
        retryOnFailure: { value: false },
        continueOnFailure: { value: false },
      },
      input: {
        url,
        method,
        headers,
        ...(isDefined(body) && { body }),
      },
    },
    __typename: 'WorkflowAction',
  };
}

function buildBridgeWorkflowBody({
  objectName,
  action,
  triggerId,
  workspaceId,
}: BridgeBodyContext): Record<string, unknown> {
  switch (objectName) {
    case 'person':
      return {
        name: `{{${triggerId}.properties.after.name.firstName}} {{${triggerId}.properties.after.name.lastName}}`,
        email: `{{${triggerId}.properties.after.emails.primaryEmail}}`,
        phone: `{{${triggerId}.properties.after.phones.primaryPhoneCallingCode}} {{${triggerId}.properties.after.phones.primaryPhoneNumber}}`,
        phoneCallingCode: `{{${triggerId}.properties.after.phones.primaryPhoneCallingCode}}`,
        phoneCountryCode: `{{${triggerId}.properties.after.phones.primaryPhoneCountryCode}}`,
        contactRole: `{{${triggerId}.properties.after.contactRole}}`,
        companyId: `{{${triggerId}.properties.after.companyId}}`,
        city: `{{${triggerId}.properties.after.city}}`,
        jobTitle: `{{${triggerId}.properties.after.jobTitle}}`,
        source: 'twenty',
        metadata: {
          source: 'twenty',
          workspaceId,
          objectName: 'person',
          eventType: `person.${action.toLowerCase()}`,
          recordId: `{{${triggerId}.properties.after.id}}`,
        },
      };
    case 'opportunity':
      return {
        contactId: `{{${triggerId}.properties.after.pointOfContactId}}`,
        type: 'buyer',
        stage: normalizeRemikaOpportunityStage(
          `{{${triggerId}.properties.after.stage}}`,
        ),
        city: `{{${triggerId}.properties.after.city}}`,
        source: 'twenty',
        metadata: {
          source: 'twenty',
          workspaceId,
          objectName: 'opportunity',
          eventType: `opportunity.${action.toLowerCase()}`,
          recordId: `{{${triggerId}.properties.after.id}}`,
          companyId: `{{${triggerId}.properties.after.companyId}}`,
          pointOfContactId: `{{${triggerId}.properties.after.pointOfContactId}}`,
          stage: normalizeRemikaOpportunityStage(
            `{{${triggerId}.properties.after.stage}}`,
          ),
        },
      };
    case 'task':
      return {
        contactId: `{{${triggerId}.properties.after.contactId}}`,
        opportunityId: `{{${triggerId}.properties.after.opportunityId}}`,
        assignedToUserId: `{{${triggerId}.properties.after.assigneeId}}`,
        status: normalizeRemikaTaskStatus(`{{${triggerId}.properties.after.status}}`),
        priority: `{{${triggerId}.properties.after.priority}}`,
        dueAt: `{{${triggerId}.properties.after.dueAt}}`,
        completedAt: `{{${triggerId}.properties.after.completedAt}}`,
        title: `{{${triggerId}.properties.after.title}}`,
        description: `{{${triggerId}.properties.after.bodyV2Markdown}}`,
        source: 'twenty',
        metadata: {
          source: 'twenty',
          workspaceId,
          objectName: 'task',
          eventType: `task.${action.toLowerCase()}`,
          recordId: `{{${triggerId}.properties.after.id}}`,
        },
      };
    case 'dashboard':
      return {
        slug: `{{${triggerId}.properties.after.slug}}`,
        name: `{{${triggerId}.properties.after.title}}`,
        description: `{{${triggerId}.properties.after.description}}`,
        ownerUserId: `{{${triggerId}.properties.after.ownerUserId}}`,
        visibility: `{{${triggerId}.properties.after.visibility}}`,
        isDefault: `{{${triggerId}.properties.after.isDefault}}`,
        metadata: {
          source: 'twenty',
          workspaceId,
          objectName: 'dashboard',
          eventType: `dashboard.${action.toLowerCase()}`,
          recordId: `{{${triggerId}.properties.after.id}}`,
          pageLayoutId: `{{${triggerId}.properties.after.pageLayoutId}}`,
        },
      };
    case 'timelineActivity':
      return {
        contactId: `{{${triggerId}.properties.after.targetPersonId}}`,
        opportunityId: `{{${triggerId}.properties.after.targetOpportunityId}}`,
        actorUserId: `{{${triggerId}.properties.after.actorUserId}}`,
        type: 'timeline_activity',
        data: {
          source: 'twenty',
          workspaceId,
          objectName: 'timelineActivity',
          eventType: `timelineActivity.${action.toLowerCase()}`,
          recordId: `{{${triggerId}.properties.after.id}}`,
          name: `{{${triggerId}.properties.after.name}}`,
          happensAt: `{{${triggerId}.properties.after.happensAt}}`,
          linkedRecordId: `{{${triggerId}.properties.after.linkedRecordId}}`,
          linkedRecordCachedName: `{{${triggerId}.properties.after.linkedRecordCachedName}}`,
        },
      };
    default:
      return {};
  }
}

function buildBridgeWorkflowRecords({
  workspaceId,
  objectMetadataMaps,
  fieldMetadataMaps,
  remikaApiBaseUrl,
  remikaPublicApiKey,
}: {
  workspaceId: string;
  objectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  fieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
  remikaApiBaseUrl: string;
  remikaPublicApiKey: string;
}) {
  const { idByNameSingular } = buildObjectIdByNameMaps(objectMetadataMaps);

  const definitions: BridgeObjectConfig[] = [
    {
      objectName: 'person',
      remikaResource: 'contacts',
      bridgeLabel: 'Contact',
      upsertPath: '/api/public/crm/v1/contacts/{{trigger.properties.after.id}}',
      deletePath:
        '/api/public/crm/v1/contacts/{{trigger.properties.before.id}}',
      buildUpsertBody: (ctx) => buildBridgeWorkflowBody(ctx),
    },
    {
      objectName: 'opportunity',
      remikaResource: 'opportunities',
      bridgeLabel: 'Opportunity',
      upsertPath:
        '/api/public/crm/v1/opportunities/{{trigger.properties.after.id}}',
      deletePath:
        '/api/public/crm/v1/opportunities/{{trigger.properties.before.id}}',
      buildUpsertBody: (ctx) => buildBridgeWorkflowBody(ctx),
    },
    {
      objectName: 'task',
      remikaResource: 'tasks',
      bridgeLabel: 'Task',
      upsertPath: '/api/public/crm/v1/tasks/{{trigger.properties.after.id}}',
      deletePath: '/api/public/crm/v1/tasks/{{trigger.properties.before.id}}',
      buildUpsertBody: (ctx) => buildBridgeWorkflowBody(ctx),
    },
    {
      objectName: 'dashboard',
      remikaResource: 'dashboards',
      bridgeLabel: 'Dashboard',
      upsertPath:
        '/api/public/crm/v1/dashboards/{{trigger.properties.after.id}}',
      deletePath:
        '/api/public/crm/v1/dashboards/{{trigger.properties.before.id}}',
      buildUpsertBody: (ctx) => buildBridgeWorkflowBody(ctx),
    },
    {
      objectName: 'timelineActivity',
      remikaResource: 'activities',
      bridgeLabel: 'Timeline Activity',
      upsertPath:
        '/api/public/crm/v1/activities/{{trigger.properties.after.id}}',
      deletePath:
        '/api/public/crm/v1/activities/{{trigger.properties.before.id}}',
      buildUpsertBody: (ctx) => buildBridgeWorkflowBody(ctx),
    },
  ];

  return definitions.flatMap((definition, index) => {
    const objectMetadataId = idByNameSingular[definition.objectName];
    if (!isDefined(objectMetadataId)) {
      return [];
    }

    const objectMetadata = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: objectMetadataId,
      flatEntityMaps: objectMetadataMaps,
    });

    if (!isDefined(objectMetadata)) {
      return [];
    }

    const objectInfo = {
      flatObjectMetadata: objectMetadata,
      flatObjectMetadataMaps: objectMetadataMaps,
      flatFieldMetadataMaps: fieldMetadataMaps,
    };

    const headerJson = {
      'Content-Type': 'application/json',
      'x-crm-public-api-key': remikaPublicApiKey,
    };

    return (['UPSERTED', 'DELETED'] as const).map((action, actionIndex) => {
      const {
        workflowId,
        workflowVersionId,
        automatedTriggerId,
        workflowName,
      } = getBridgeIds(workspaceId, definition.objectName, action);
      const triggerId = `${action === 'UPSERTED' ? 'trigger-after' : 'trigger-before'}-${workflowId}`;
      const eventName = `${definition.objectName}.${action.toLowerCase()}`;
      const remikaPath =
        action === 'UPSERTED' ? definition.upsertPath : definition.deletePath;
      const url = new URL(remikaPath, remikaApiBaseUrl).toString();

      const trigger = {
        name:
          action === 'UPSERTED'
            ? 'Record is created or updated'
            : 'Record is deleted',
        type: 'DATABASE_EVENT',
        settings: {
          eventName,
          fields: [],
          outputSchema: generateFakeObjectRecordEvent(
            objectInfo,
            action === 'UPSERTED'
              ? DatabaseEventAction.UPSERTED
              : DatabaseEventAction.DELETED,
          ),
        },
        nextStepIds: [triggerId],
      };

      const body =
        action === 'UPSERTED'
          ? jsonStringify(
              definition.buildUpsertBody({
                triggerId: 'trigger',
                workspaceId,
                objectName: definition.objectName,
                action,
              }),
            )
          : jsonStringify(
              buildBridgeDeleteBody({
                triggerId: 'trigger',
                workspaceId,
                objectName: definition.objectName,
                action,
              }),
            );

      const step = buildWorkflowHttpRequestStep({
        id: triggerId,
        name: `Sync ${definition.bridgeLabel} to Remika`,
        method: action === 'UPSERTED' ? 'PUT' : 'DELETE',
        url,
        headers: headerJson,
        ...(body ? { body } : {}),
        nextStepIds: null,
      });

      return {
        workflow: {
          id: workflowId,
          name: workflowName,
          lastPublishedVersionId: workflowVersionId,
          statuses: ['ACTIVE'],
          position: 100 + index * 10 + actionIndex,
          createdBySource: FieldActorSource.SYSTEM,
          createdByWorkspaceMemberId: null,
          createdByName: 'System',
          createdByContext: {},
          updatedBySource: FieldActorSource.SYSTEM,
          updatedByWorkspaceMemberId: null,
          updatedByName: 'System',
        },
        workflowVersion: {
          id: workflowVersionId,
          name: 'v1',
          trigger: JSON.stringify(trigger),
          steps: JSON.stringify([step]),
          status: 'ACTIVE',
          position: 1,
          workflowId,
        },
        workflowAutomatedTrigger: {
          id: automatedTriggerId,
          workflowId,
          type: 'DATABASE_EVENT',
          settings: {
            eventName,
            fields: [],
            outputSchema: generateFakeObjectRecordEvent(
              objectInfo,
              action === 'UPSERTED'
                ? DatabaseEventAction.UPSERTED
                : DatabaseEventAction.DELETED,
            ),
          },
        },
      };
    });
  });
}

async function ensureSignalWebhook({
  webhookService,
  workspaceId,
  targetUrl,
  secret,
}: {
  webhookService: WebhookService;
  workspaceId: string;
  targetUrl: string;
  secret: string;
}) {
  const operations = ['timelineActivity.*', 'signal.*'];
  const description = REMIKA_BRIDGE_WEBHOOK_DESCRIPTION;
  const existing = await webhookService.findAll(workspaceId);
  const match = existing.find(
    (item) =>
      item.targetUrl === targetUrl &&
      JSON.stringify(item.operations) === JSON.stringify(operations),
  );

  if (match) {
    if (match.secret === secret && match.description === description) {
      return match;
    }

    return webhookService.update(
      {
        id: match.id,
        update: {
          targetUrl,
          operations,
          description,
          secret,
        },
      },
      workspaceId,
    );
  }

  return webhookService.create(
    {
      targetUrl,
      operations,
      description,
      secret,
    },
    workspaceId,
  );
}

export const prefillRemikaBridgeIntegrations = async ({
  dataSource,
  webhookService,
  workspaceId,
  schemaName,
  flatObjectMetadataMaps,
  flatFieldMetadataMaps,
}: {
  dataSource: DataSource;
  webhookService: WebhookService;
  workspaceId: string;
  schemaName: string;
  flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
  flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
}) => {
  const remikaApiBaseUrl =
    process.env.REMIKA_API_BASE_URL || 'http://host.docker.internal:3000';
  const remikaPublicApiKey =
    process.env.REMIKA_API_PUBLIC_KEY || 'dev-crm-public-api-key';
  const remikaWebhookSecret =
    process.env.REMIKA_WEBHOOK_SECRET || 'dev-crm-webhook-secret';

  const bridgeRows = buildBridgeWorkflowRecords({
    workspaceId,
    objectMetadataMaps: flatObjectMetadataMaps,
    fieldMetadataMaps: flatFieldMetadataMaps,
    remikaApiBaseUrl,
    remikaPublicApiKey,
  });

  if (bridgeRows.length > 0) {
    await dataSource.transaction(async (entityManager) => {
      await entityManager
        .createQueryBuilder()
        .insert()
        .into(`${schemaName}.workflow`)
        .orIgnore()
        .values(bridgeRows.map((row) => row.workflow))
        .execute();

      await entityManager
        .createQueryBuilder()
        .insert()
        .into(`${schemaName}.workflowVersion`)
        .orIgnore()
        .values(bridgeRows.map((row) => row.workflowVersion))
        .execute();

      await entityManager
        .createQueryBuilder()
        .insert()
        .into(`${schemaName}.workflowAutomatedTrigger`)
        .orIgnore()
        .values(bridgeRows.map((row) => row.workflowAutomatedTrigger))
        .execute();

      await Promise.all(
        bridgeRows.map(async ({ workflow, workflowVersion, workflowAutomatedTrigger }) => {
          const { id: workflowId, ...workflowUpdate } = workflow;
          const { id: workflowVersionId, ...workflowVersionUpdate } = workflowVersion;
          const {
            id: workflowAutomatedTriggerId,
            ...workflowAutomatedTriggerUpdate
          } = workflowAutomatedTrigger;

          await entityManager
            .createQueryBuilder()
            .update(`${schemaName}.workflow`)
            .set(workflowUpdate)
            .where('id = :id', { id: workflowId })
            .execute();

          await entityManager
            .createQueryBuilder()
            .update(`${schemaName}.workflowVersion`)
            .set(workflowVersionUpdate)
            .where('id = :id', { id: workflowVersionId })
            .execute();

          await entityManager
            .createQueryBuilder()
            .update(`${schemaName}.workflowAutomatedTrigger`)
            .set(workflowAutomatedTriggerUpdate)
            .where('id = :id', { id: workflowAutomatedTriggerId })
            .execute();
        }),
      );
    });
  }

  const webhookUrl = new URL(
    '/api/webhooks/crm/v1/events',
    remikaApiBaseUrl,
  ).toString();
  await ensureSignalWebhook({
    webhookService,
    workspaceId,
    targetUrl: webhookUrl,
    secret: remikaWebhookSecret,
  });
};
