import { type CSSProperties, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { REMIKA_CLIENT_ACTIVITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/modules/remika-dashboard/constants';
import {
  buildRemikaCrmHandoffUrl,
  fetchCrmClientActivitySummary,
  fetchCrmNextActions,
} from 'src/modules/remika-dashboard/remika-api';
import { THEME } from 'src/modules/remika-dashboard/theme';
import {
  Button,
  Status,
  Tag,
} from 'src/modules/remika-dashboard/twenty-ui-primitives';
import {
  type CrmClientActivityTwentySafeSnapshot,
  type CrmClientActivityTwentySafeResponse,
  type CrmNextAction,
  type CrmNextActionsResponse,
} from 'src/modules/remika-dashboard/types';

const styles = {
  root: {
    background: THEME.bgPrimary,
    boxSizing: 'border-box',
    color: THEME.fontPrimary,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: THEME.fontFamily,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    width: '100%',
  } as CSSProperties,
  header: {
    alignItems: 'center',
    borderBottom: `1px solid ${THEME.borderLight}`,
    display: 'flex',
    gap: 12,
    justifyContent: 'space-between',
    padding: '12px 12px 8px',
  } as CSSProperties,
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  } as CSSProperties,
  title: {
    color: THEME.fontPrimary,
    fontSize: THEME.fontSizeLg,
    fontWeight: THEME.fontWeightSemiBold,
    lineHeight: 1.2,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  subtitle: {
    color: THEME.fontTertiary,
    fontSize: THEME.fontSizeSm,
    lineHeight: 1.25,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  content: {
    display: 'grid',
    flex: 1,
    gap: 12,
    gridTemplateColumns: 'minmax(220px, 0.75fr) minmax(260px, 1.25fr)',
    minHeight: 0,
    padding: 12,
  } as CSSProperties,
  panel: {
    background: THEME.bgSecondary,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
    minHeight: 0,
    overflow: 'hidden',
    padding: 12,
  } as CSSProperties,
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
  } as CSSProperties,
  metricGrid: {
    display: 'grid',
    gap: 8,
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  } as CSSProperties,
  metric: {
    background: THEME.bgPrimary,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
    minWidth: 0,
    padding: 10,
  } as CSSProperties,
  metricLabel: {
    color: THEME.fontTertiary,
    fontSize: THEME.fontSizeXs,
    lineHeight: 1.2,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  metricValue: {
    color: THEME.fontPrimary,
    fontSize: 22,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 650,
    letterSpacing: '-0.02em',
    lineHeight: 1,
    margin: '6px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  sectionLabel: {
    color: THEME.fontSecondary,
    fontSize: THEME.fontSizeSm,
    fontWeight: THEME.fontWeightSemiBold,
    lineHeight: 1.2,
    margin: '0 0 8px',
  } as CSSProperties,
  text: {
    color: THEME.fontSecondary,
    fontSize: THEME.fontSizeSm,
    lineHeight: 1.45,
    margin: 0,
  } as CSSProperties,
  muted: {
    color: THEME.fontTertiary,
    fontSize: THEME.fontSizeSm,
    lineHeight: 1.4,
    margin: 0,
  } as CSSProperties,
  tagRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  } as CSSProperties,
  propertyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 178,
    overflow: 'auto',
  } as CSSProperties,
  propertyRow: {
    background: THEME.bgPrimary,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
    padding: 9,
  } as CSSProperties,
  propertyTitle: {
    color: THEME.fontPrimary,
    fontSize: THEME.fontSizeSm,
    fontWeight: THEME.fontWeightMedium,
    lineHeight: 1.3,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  footer: {
    alignItems: 'center',
    borderTop: `1px solid ${THEME.borderLight}`,
    display: 'flex',
    gap: 8,
    justifyContent: 'space-between',
    padding: '8px 12px',
  } as CSSProperties,
  linkButton: {
    background: THEME.blue,
    borderRadius: THEME.radiusSm,
    color: '#fff',
    fontSize: THEME.fontSizeSm,
    fontWeight: THEME.fontWeightMedium,
    lineHeight: '24px',
    padding: '0 10px',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  } as CSSProperties,
  state: {
    alignItems: 'center',
    color: THEME.fontTertiary,
    display: 'flex',
    flex: 1,
    fontSize: THEME.fontSizeSm,
    justifyContent: 'center',
    minHeight: 120,
    padding: 20,
    textAlign: 'center',
  } as CSSProperties,
};

type WidgetData = {
  activity: CrmClientActivityTwentySafeSnapshot | null;
  action: CrmNextAction | null;
  organizationId: string | null;
};

function assertTwentySafeClientActivity(
  activity: CrmClientActivityTwentySafeSnapshot,
) {
  if (activity.permissions.canMutateFromTwenty !== false) {
    throw new Error('Client activity must remain readonly for Twenty');
  }

  if (activity.permissions.includeEvidence !== false) {
    throw new Error('Twenty client activity must not include full evidence');
  }

  if (activity.safeEvidence.length !== 0) {
    throw new Error('Twenty client activity must not expose evidence rows');
  }
}

function actionIdentity(
  action: CrmNextAction,
  organizationId: string | null,
) {
  return {
    actionId: action.id,
    actionKind: action.kind,
    organizationId,
    sourceContextHash: action.sourceContextHash || action.id,
    targetId: action.targetId,
    targetType: action.targetType,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

function activityColor(level: CrmClientActivityTwentySafeSnapshot['summary']['activityLevel']) {
  if (level === 'high') return 'green';
  if (level === 'medium') return 'blue';
  if (level === 'low') return 'orange';
  return 'red';
}

function blockerText(activity: CrmClientActivityTwentySafeSnapshot) {
  if (!activity.blockers.length) return 'No blockers reported.';
  return activity.blockers
    .slice(0, 3)
    .map(blocker => `${blocker.code}: ${blocker.message}`)
    .join(' · ');
}

const RemikaClientActivity = () => {
  const [data, setData] = useState<WidgetData>({
    activity: null,
    action: null,
    organizationId: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivity = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextActions =
        await fetchCrmNextActions<CrmNextActionsResponse>({
          window: '14d',
        });
      const action = nextActions.data.actions.find(
        item => item.targetId && item.targetType,
      );

      if (!action) {
        setData({
          activity: null,
          action: null,
          organizationId: nextActions.data.organizationId,
        });
        return;
      }

      const response =
        await fetchCrmClientActivitySummary<CrmClientActivityTwentySafeResponse>(
          {
            targetId: action.targetId,
            targetType: action.targetType,
            window: '14d',
          },
        );

      assertTwentySafeClientActivity(response.data);
      setData({
        activity: response.data,
        action,
        organizationId: nextActions.data.organizationId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load client activity';
      setError(message);
      enqueueSnackbar({ message, variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadActivity();
  }, []);

  const activity = data.activity;
  const action = data.action;
  const handoffUrl =
    action && activity
      ? buildRemikaCrmHandoffUrl(actionIdentity(action, data.organizationId))
      : null;

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.titleBlock}>
          <h3 style={styles.title}>Client activity</h3>
          <p style={styles.subtitle}>
            Readonly Remika-safe summary. No raw behavior or mutation CTA.
          </p>
        </div>
        <Button isLoading={isLoading} onClick={loadActivity} title="Refresh" />
      </div>

      {isLoading && !activity ? (
        <div style={styles.state}>Loading Remika client activity...</div>
      ) : error && !activity ? (
        <div style={styles.state}>{error}</div>
      ) : !activity || !action ? (
        <div style={styles.state}>
          No next-action target is available for a client activity summary.
        </div>
      ) : (
        <>
          <div style={styles.content}>
            <div style={{ ...styles.panel, ...styles.stack }}>
              <div style={styles.tagRow}>
                <Status
                  color={activityColor(activity.summary.activityLevel)}
                  text={activity.summary.activityLevel}
                  weight="medium"
                />
                <Tag
                  color={activity.summary.degraded ? 'orange' : 'green'}
                  text={activity.summary.degraded ? 'Degraded' : 'Ready'}
                  weight="medium"
                />
                <Tag text={activity.window.value} color="blue" />
                <Tag text={activity.identity.status} color="blue" />
              </div>

              <div>
                <p style={styles.sectionLabel}>Selected target</p>
                <p style={styles.text}>
                  {activity.target.displayName || action.clientName} · {activity.target.type}
                </p>
                <p style={styles.muted}>
                  From next action: {action.kind} · score {action.score}
                </p>
              </div>

              <div style={styles.metricGrid}>
                <div style={styles.metric}>
                  <p style={styles.metricLabel}>Score</p>
                  <p style={styles.metricValue}>{activity.summary.engagementScore}</p>
                </div>
                <div style={styles.metric}>
                  <p style={styles.metricLabel}>Properties</p>
                  <p style={styles.metricValue}>{activity.summary.counts.properties}</p>
                </div>
                <div style={styles.metric}>
                  <p style={styles.metricLabel}>Shares</p>
                  <p style={styles.metricValue}>{activity.shareResponse.sentCount}</p>
                </div>
              </div>

              <div>
                <p style={styles.sectionLabel}>Latest activity</p>
                <p style={styles.text}>
                  Last active: {formatDateTime(activity.summary.lastActiveAt)}
                </p>
                <p style={styles.text}>
                  Last property view:{' '}
                  {formatDateTime(activity.summary.lastPropertyViewedAt)}
                </p>
                <p style={styles.text}>
                  Share response: sent {activity.shareResponse.sentCount}, responded{' '}
                  {activity.shareResponse.respondedCount}, opened{' '}
                  {activity.shareResponse.openedCount ?? 'planned'}
                </p>
              </div>
            </div>

            <div style={{ ...styles.panel, ...styles.stack }}>
              <div>
                <p style={styles.sectionLabel}>Property interest</p>
                {activity.propertyInterest.topProperties.length ? (
                  <div style={styles.propertyList}>
                    {activity.propertyInterest.topProperties.slice(0, 4).map(property => (
                      <div
                        key={property.evidenceHash || property.listingKey || property.label}
                        style={styles.propertyRow}
                      >
                        <p style={styles.propertyTitle}>{property.label}</p>
                        <p style={styles.muted}>
                          views {property.viewCount} · revisits {property.revisitCount}
                          {property.highIntent ? ' · high intent' : ''}
                          {property.favorited ? ' · favorited' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={styles.muted}>No property evidence in the safe summary.</p>
                )}
              </div>

              <div>
                <p style={styles.sectionLabel}>Saved search and content</p>
                <p style={styles.text}>
                  Active searches: {activity.savedSearches.activeCount} · stale{' '}
                  {activity.savedSearches.staleCount}
                </p>
                <p style={styles.text}>
                  Content status: {activity.contentInterest.status}
                </p>
              </div>

              <div>
                <p style={styles.sectionLabel}>Blockers</p>
                <p style={styles.text}>{blockerText(activity)}</p>
              </div>

              <div>
                <p style={styles.sectionLabel}>Evidence posture</p>
                <p style={styles.text}>
                  Twenty receives summary only. Safe evidence rows returned:{' '}
                  {activity.safeEvidence.length}.
                </p>
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <p style={styles.muted}>
              canMutateFromTwenty=false · review/task/draft stay in Remika
            </p>
            {handoffUrl ? (
              <a href={handoffUrl} rel="noreferrer" target="_blank" style={styles.linkButton}>
                Open in Remika
              </a>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: REMIKA_CLIENT_ACTIVITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Remika client activity',
  description: 'Displays readonly Remika-safe client activity summary inside Twenty.',
  component: RemikaClientActivity,
});
