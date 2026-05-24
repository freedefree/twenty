import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { REMIKA_NEXT_ACTIONS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/modules/remika-dashboard/constants';
import {
  buildRemikaCrmHandoffUrl,
  fetchCrmNextActionDetail,
  fetchCrmNextActions,
} from 'src/modules/remika-dashboard/remika-api';
import { THEME } from 'src/modules/remika-dashboard/theme';
import {
  Button,
  Status,
  Tag,
} from 'src/modules/remika-dashboard/twenty-ui-primitives';
import {
  type CrmNextAction,
  type CrmNextActionDetailData,
  type CrmNextActionDetailResponse,
  type CrmNextActionHandoffIdentityInput,
  type CrmNextActionsResponse,
  type CrmNextActionSnapshot,
} from 'src/modules/remika-dashboard/types';
import { assertCrmNextActionReadonlyBridge } from '../../../../../../../../shared/crm/next-actions';

const SUMMARY_LIMIT = 8;
const SAFE_EVENT_LIMIT = 4;
const SAFE_EVIDENCE_LIMIT = 4;

const toCrmNextActionHandoffIdentity = (
  action: Pick<
    CrmNextAction,
    'id' | 'kind' | 'targetType' | 'targetId' | 'sourceContextHash'
  >,
  organizationId?: string | null,
): CrmNextActionHandoffIdentityInput => ({
  actionId: action.id,
  actionKind: action.kind,
  targetType: action.targetType,
  targetId: action.targetId,
  sourceContextHash: action.sourceContextHash || '',
  organizationId: organizationId ?? null,
});

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 0,
    color: THEME.fontPrimary,
    background:
      'radial-gradient(circle at top right, rgba(59, 130, 246, 0.07), transparent 30%), radial-gradient(circle at bottom left, rgba(249, 115, 22, 0.06), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))',
    fontFamily: THEME.fontFamily,
    boxSizing: 'border-box',
  } as const,
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 12px 10px',
    borderBottom: `1px solid ${THEME.borderLight}`,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.02), transparent)',
  } as const,
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  } as const,
  eyebrow: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  } as const,
  title: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.2,
  } as const,
  subtitle: {
    margin: 0,
    color: THEME.fontSecondary,
    fontSize: 12,
    lineHeight: 1.35,
  } as const,
  headerActions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    alignItems: 'center',
  } as const,
  linkButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 24,
    padding: '0 10px',
    borderRadius: THEME.radiusSm,
    border: `1px solid ${THEME.borderMedium}`,
    background: THEME.bgSecondary,
    color: THEME.fontSecondary,
    fontSize: THEME.fontSizeSm,
    fontWeight: THEME.fontWeightMedium,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  } as const,
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 8,
    padding: 12,
    borderBottom: `1px solid ${THEME.borderLight}`,
  } as const,
  summaryCard: {
    minWidth: 0,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
    padding: 10,
    background: 'rgba(255,255,255,0.03)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
  } as const,
  summaryLabel: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 11,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const,
  summaryValue: {
    margin: '6px 0 0',
    color: THEME.fontPrimary,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  } as const,
  summaryMeta: {
    margin: '4px 0 0',
    color: THEME.fontSecondary,
    fontSize: 11,
    lineHeight: 1.3,
  } as const,
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
    minHeight: 0,
    flex: 1,
  } as const,
  listPane: {
    minHeight: 0,
    padding: 12,
    borderRight: `1px solid ${THEME.borderLight}`,
    overflow: 'hidden',
  } as const,
  detailPane: {
    minHeight: 0,
    padding: 12,
    overflow: 'hidden',
  } as const,
  paneTitle: {
    margin: '0 0 10px',
    color: THEME.fontSecondary,
    fontSize: 12,
    fontWeight: 600,
  } as const,
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 0,
    overflow: 'auto',
    paddingRight: 4,
  } as const,
  listItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    width: '100%',
    padding: 10,
    borderRadius: THEME.radiusMd,
    border: `1px solid ${THEME.borderLight}`,
    background: 'rgba(255,255,255,0.02)',
    color: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
  } as const,
  listItemActive: {
    border: `1px solid ${THEME.blue}`,
    background: 'rgba(59,130,246,0.06)',
    boxShadow: `0 0 0 1px ${THEME.blue} inset`,
  } as const,
  listItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'flex-start',
  } as const,
  listItemTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  } as const,
  listItemTitle: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 12,
    fontWeight: 650,
    lineHeight: 1.25,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  listItemMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  } as const,
  listItemBody: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 10,
    alignItems: 'end',
  } as const,
  listItemReason: {
    margin: 0,
    color: THEME.fontSecondary,
    fontSize: 11,
    lineHeight: 1.45,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  } as const,
  listItemScore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 3,
    whiteSpace: 'nowrap',
  } as const,
  listItemScoreLabel: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 10,
    lineHeight: 1.2,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
  } as const,
  listItemScoreValue: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  } as const,
  detailCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
    height: '100%',
    borderRadius: THEME.radiusMd,
    border: `1px solid ${THEME.borderLight}`,
    background: 'rgba(255,255,255,0.02)',
    padding: 12,
  } as const,
  detailTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  } as const,
  detailTitleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'flex-start',
  } as const,
  detailTitleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  } as const,
  detailTitle: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.25,
  } as const,
  detailSubtitle: {
    margin: 0,
    color: THEME.fontSecondary,
    fontSize: 12,
    lineHeight: 1.4,
  } as const,
  detailMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  } as const,
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  } as const,
  sectionLabel: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
  } as const,
  sectionText: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 12,
    lineHeight: 1.55,
  } as const,
  evidenceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  } as const,
  evidenceItem: {
    padding: 10,
    borderRadius: THEME.radiusMd,
    border: `1px solid ${THEME.borderLight}`,
    background: 'rgba(255,255,255,0.03)',
  } as const,
  evidenceSource: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 11,
    lineHeight: 1.25,
  } as const,
  evidenceSummary: {
    margin: '4px 0 0',
    color: THEME.fontSecondary,
    fontSize: 11,
    lineHeight: 1.45,
  } as const,
  evidenceMeta: {
    margin: '4px 0 0',
    color: THEME.fontTertiary,
    fontSize: 10,
    lineHeight: 1.25,
  } as const,
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  } as const,
  eventItem: {
    padding: 10,
    borderRadius: THEME.radiusMd,
    border: `1px solid ${THEME.borderLight}`,
    background: 'rgba(255,255,255,0.025)',
  } as const,
  eventTitle: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 11,
    fontWeight: 650,
    lineHeight: 1.35,
  } as const,
  eventText: {
    margin: '4px 0 0',
    color: THEME.fontSecondary,
    fontSize: 11,
    lineHeight: 1.45,
  } as const,
  state: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    padding: 16,
    color: THEME.fontTertiary,
    fontSize: 13,
    textAlign: 'center',
  } as const,
  stateError: {
    color: THEME.red,
  } as const,
} as const;

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function kindLabel(kind: CrmNextAction['kind']) {
  const labels: Record<CrmNextAction['kind'], string> = {
    follow_up_now: 'Follow up now',
    send_property_recommendation: 'Property recommendation',
    respond_to_feedback: 'Respond to feedback',
    review_saved_search: 'Review saved search',
    watch_listing_update: 'Watch listing update',
    schedule_showing: 'Schedule showing',
    update_opportunity: 'Update opportunity',
    review_sync_blocker: 'Review sync blocker',
  }

  return labels[kind]
}

function priorityTone(priority: CrmNextAction['priority']) {
  if (priority === 'urgent') return 'red'
  if (priority === 'high') return 'orange'
  if (priority === 'medium') return 'blue'
  return 'green'
}

function reviewTone(action: CrmNextAction) {
  if (action.review.visibility === 'blocked') return 'red'
  if (action.review.visibility === 'degraded') return 'orange'
  if (action.review.visibility === 'snoozed') return 'blue'
  if (action.review.visibility === 'stale') return 'orange'
  if (action.review.status === 'accepted' || action.review.status === 'done') return 'green'
  return 'blue'
}

function eventLabel(eventType: CrmNextActionDetailData['events'][number]['eventType']) {
  const labels: Record<CrmNextActionDetailData['events'][number]['eventType'], string> = {
    accepted: 'Accepted',
    snoozed: 'Snoozed',
    dismissed: 'Dismissed',
    done: 'Done',
    reopened: 'Reopened',
    task_created: 'Task created',
    draft_created: 'Draft created',
    approval_recorded: 'Approval recorded',
    sync_failed: 'Sync failed',
    stale_marked: 'Stale marked',
  }

  return labels[eventType]
}

function ensureReadonlySnapshot(snapshot: CrmNextActionSnapshot) {
  const permissionIssues = [
    snapshot.permissions.canReview,
    snapshot.permissions.canGenerateDraft,
    snapshot.permissions.canCreateTask,
    snapshot.permissions.canDismiss,
    snapshot.permissions.canReopen,
    snapshot.permissions.canSend,
    snapshot.permissions.canMirrorToTwenty,
  ].some(value => value !== false)

  if (permissionIssues) {
    throw new Error('Remika next-action bridge must remain readonly for Twenty')
  }

  snapshot.actions.forEach(action => {
    assertCrmNextActionReadonlyBridge(action)
  })
}

const RemikaNextActions = () => {
  const [data, setData] = useState<CrmNextActionSnapshot | null>(null)
  const [detail, setDetail] = useState<CrmNextActionDetailData | null>(null)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)
    setDetailError(null)

    ;(async () => {
      try {
        const response = await fetchCrmNextActions<CrmNextActionsResponse>({
          limit: `${SUMMARY_LIMIT}`,
        })

        if (!response?.success || !response.data) {
          throw new Error('Failed to load Remika next actions')
        }

        ensureReadonlySnapshot(response.data)

        if (!cancelled) {
          setData(response.data)
          setSelectedActionId(currentSelectedId => {
            const currentSelectedStillVisible =
              currentSelectedId &&
              response.data.actions.some(action => action.id === currentSelectedId)
            return currentSelectedStillVisible
              ? currentSelectedId
              : response.data.actions[0]?.id || null
          })
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load Remika next actions'

        if (!cancelled) {
          setData(null)
          setDetail(null)
          setSelectedActionId(null)
          setError(message)
          enqueueSnackbar({ message, variant: 'error' })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const selectedAction =
    data?.actions.find(action => action.id === selectedActionId) || data?.actions[0] || null
  const selectedActionIdentity = selectedAction
    ? toCrmNextActionHandoffIdentity(selectedAction, data?.organizationId)
    : null
  const selectedActionHandoffUrl = selectedActionIdentity
    ? buildRemikaCrmHandoffUrl(selectedActionIdentity)
    : null
  const summary = data?.summary
  const audit = data?.audit
  const topEventCount = detail?.events?.slice(0, SAFE_EVENT_LIMIT).length || 0

  useEffect(() => {
    if (!selectedAction) {
      setDetail(null)
      setDetailError(null)
      setDetailLoading(false)
      return
    }

    const actionIdentity = toCrmNextActionHandoffIdentity(
      selectedAction,
      data?.organizationId
    )

    let cancelled = false

    setDetailLoading(true)
    setDetailError(null)

    ;(async () => {
      try {
        const response = await fetchCrmNextActionDetail<CrmNextActionDetailResponse>(
          actionIdentity,
          { includeHistory: true }
        )

        if (!response?.success || !response.data) {
          throw new Error('Failed to load Remika next action detail')
        }

        assertCrmNextActionReadonlyBridge(response.data)

        if (!cancelled) {
          setDetail(response.data)
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load Remika next action detail'

        if (!cancelled) {
          setDetail(null)
          setDetailError(message)
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    data?.organizationId,
    reloadKey,
    selectedAction?.id,
    selectedAction?.kind,
    selectedAction?.sourceContextHash,
    selectedAction?.targetId,
    selectedAction?.targetType,
  ])

  if (loading && !data) {
    return <div style={styles.state}>Loading Remika next actions...</div>
  }

  if (error && !data) {
    return <div style={{ ...styles.state, ...styles.stateError }}>{error}</div>
  }

  const actions = data?.actions || []
  const selectedReview = selectedAction?.review
  const selectedExecution = selectedAction?.execution
  const selectedSync = selectedAction?.sync
  const selectedPermissions = selectedAction?.permissions

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.titleBlock}>
          <p style={styles.eyebrow}>Readonly bridge</p>
          <h3 style={styles.title}>Remika next actions</h3>
          <p style={styles.subtitle}>
            Safe review and execution state from Remika, with handoff back to `/my/crm`.
          </p>
        </div>

        <div style={styles.headerActions}>
          {selectedActionHandoffUrl ? (
            <a
              href={selectedActionHandoffUrl}
              rel="noreferrer"
              target="_blank"
              style={styles.linkButton}
            >
              Open in Remika
            </a>
          ) : null}
          <Button
            title="Refresh"
            size="small"
            variant="secondary"
            isLoading={loading}
            onClick={() => setReloadKey((value) => value + 1)}
          />
        </div>
      </div>

      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Actions</p>
          <p style={styles.summaryValue}>{summary?.total ?? 0}</p>
          <p style={styles.summaryMeta}>Loaded from Remika</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Urgent</p>
          <p style={styles.summaryValue}>{summary?.urgent ?? 0}</p>
          <p style={styles.summaryMeta}>Priority queue</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>High</p>
          <p style={styles.summaryValue}>{summary?.high ?? 0}</p>
          <p style={styles.summaryMeta}>Fast follow-up</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Needs review</p>
          <p style={styles.summaryValue}>{summary?.needsReview ?? 0}</p>
          <p style={styles.summaryMeta}>Needs human attention</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Blocked</p>
          <p style={styles.summaryValue}>{summary?.blocked ?? 0}</p>
          <p style={styles.summaryMeta}>Sync / data blockers</p>
        </div>
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>Bridge state</p>
          <p style={styles.summaryValue}>{summary?.degraded ? 'Degraded' : 'Safe'}</p>
          <p style={styles.summaryMeta}>{audit?.degradedReasons?.[0] || 'Readonly only'}</p>
        </div>
      </div>

      {error ? (
        <div
          style={{
            padding: '0 12px 12px',
            color: THEME.red,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={styles.body}>
        <div style={styles.listPane}>
          <p style={styles.paneTitle}>Queue</p>
          <div style={styles.list}>
            {actions.length === 0 ? (
              <div style={styles.state}>No Remika next actions are available yet.</div>
            ) : (
              actions.map(action => {
                const isSelected = action.id === selectedAction?.id
                return (
                  <button
                    key={action.id}
                    type="button"
                    style={{
                      ...styles.listItem,
                      ...(isSelected ? styles.listItemActive : {}),
                    }}
                    onClick={() => setSelectedActionId(action.id)}
                  >
                    <div style={styles.listItemHeader}>
                      <div style={styles.listItemTitleBlock}>
                        <p style={styles.listItemTitle}>{action.clientName}</p>
                        <div style={styles.listItemMeta}>
                          <Tag color={priorityTone(action.priority)} text={action.priority} />
                          <Tag color={reviewTone(action)} text={action.review.visibility} />
                          <Status
                            color={action.sync.readonly ? 'blue' : 'green'}
                            text={action.sync.readonly ? 'Readonly' : 'Writable'}
                          />
                        </div>
                      </div>
                      <div style={styles.listItemScore}>
                        <p style={styles.listItemScoreLabel}>Score</p>
                        <p style={styles.listItemScoreValue}>{action.score}</p>
                      </div>
                    </div>

                    <div style={styles.listItemBody}>
                      <p style={styles.listItemReason}>{action.reason}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <Tag color="blue" text={kindLabel(action.kind)} />
                        <span
                          style={{
                            color: THEME.fontTertiary,
                            fontSize: 10,
                            textAlign: 'right',
                            lineHeight: 1.35,
                          }}
                        >
                          Due {formatDateTime(action.dueAt)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div style={styles.detailPane}>
          <p style={styles.paneTitle}>Selected action</p>
          {selectedAction ? (
            <div style={styles.detailCard}>
              <div style={styles.detailTop}>
                <div style={styles.detailTitleRow}>
                  <div style={styles.detailTitleBlock}>
                    <p style={styles.detailTitle}>{selectedAction.clientName}</p>
                    <p style={styles.detailSubtitle}>{kindLabel(selectedAction.kind)}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Tag color={priorityTone(selectedAction.priority)} text={selectedAction.priority} />
                    <Tag
                      color={selectedAction.sync.readonly ? 'blue' : 'green'}
                      text={selectedAction.sync.readonly ? 'Readonly' : 'Writable'}
                    />
                  </div>
                </div>

                <div style={styles.detailMeta}>
                  <Tag color={reviewTone(selectedAction)} text={selectedReview?.visibility || 'active'} />
                  <Status
                    color={selectedExecution?.linkedTaskId ? 'green' : 'blue'}
                    text={selectedExecution?.linkedTaskId ? 'Task linked' : 'No task yet'}
                  />
                  <Status
                    color={selectedExecution?.linkedDraftRef ? 'orange' : 'blue'}
                    text={selectedExecution?.linkedDraftRef ? 'Draft only' : 'No draft yet'}
                  />
                  <Status
                    color={selectedPermissions?.denyReason ? 'red' : 'green'}
                    text={selectedPermissions?.denyReason ? 'Denied' : 'Allowed'}
                  />
                </div>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionLabel}>Reason</p>
                <p style={styles.sectionText}>{selectedAction.reason}</p>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionLabel}>Execution</p>
                <p style={styles.sectionText}>
                  Due {formatDateTime(selectedAction.dueAt)} · {selectedAction.suggestedChannel}{' '}
                  · {selectedAction.suggestedAction}
                </p>
              </div>

              <div style={styles.section}>
                <p style={styles.sectionLabel}>Safe evidence</p>
                {detailLoading && !detail ? (
                  <div style={styles.state}>Loading detail...</div>
                ) : detailError && !detail ? (
                  <div style={{ ...styles.state, ...styles.stateError }}>{detailError}</div>
                ) : detail?.safeEvidence?.length ? (
                  <div style={styles.evidenceList}>
                    {detail.safeEvidence.slice(0, SAFE_EVIDENCE_LIMIT).map(item => (
                      <div key={`${item.sourceType}:${item.linkedRecordId || item.summary}`} style={styles.evidenceItem}>
                        <p style={styles.evidenceSource}>{item.sourceType}</p>
                        <p style={styles.evidenceSummary}>{item.summary}</p>
                        <p style={styles.evidenceMeta}>
                          {item.redactionStatus} · {formatDateTime(item.occurredAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.sectionText}>No safe evidence returned yet.</p>
                )}
              </div>

              <div style={styles.section}>
                <p style={styles.sectionLabel}>Recent events</p>
                {detail?.events?.length ? (
                  <div style={styles.eventList}>
                    {detail.events.slice(0, SAFE_EVENT_LIMIT).map(event => (
                      <div key={event.id} style={styles.eventItem}>
                        <p style={styles.eventTitle}>
                          {formatDateTime(event.createdAt)} · {eventLabel(event.eventType)}
                        </p>
                        <p style={styles.eventText}>
                          {event.summary}
                          {event.linkedTaskId ? ` · task ${event.linkedTaskId}` : ''}
                          {event.linkedDraftRef ? ` · draft ${event.linkedDraftRef}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.sectionText}>No safe events returned yet.</p>
                )}
              </div>

              {selectedSync?.blocker || selectedPermissions?.denyReason ? (
                <div style={styles.section}>
                  <p style={styles.sectionLabel}>Blocker</p>
                  <p style={styles.sectionText}>
                    {selectedSync?.blocker || selectedPermissions?.denyReason}
                  </p>
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 'auto' }}>
                <span style={{ color: THEME.fontTertiary, fontSize: 11, alignSelf: 'center' }}>
                  {topEventCount} safe event{topEventCount === 1 ? '' : 's'} shown
                </span>
                {selectedActionHandoffUrl ? (
                  <a
                    href={selectedActionHandoffUrl}
                    rel="noreferrer"
                    target="_blank"
                    style={styles.linkButton}
                  >
                    Review in Remika
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <div style={styles.state}>No next action selected.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default defineFrontComponent({
  universalIdentifier: REMIKA_NEXT_ACTIONS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Remika next actions',
  description: 'Displays Remika next-action review state inside Twenty.',
  component: RemikaNextActions,
});
