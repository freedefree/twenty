import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { REMIKA_CRM_OVERVIEW_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/modules/remika-dashboard/constants';
import { fetchCrmOverview } from 'src/modules/remika-dashboard/remika-api';
import { THEME } from 'src/modules/remika-dashboard/theme';
import {
  Button,
  Status,
  Tag,
} from 'src/modules/remika-dashboard/twenty-ui-primitives';
import { type CrmOverviewResponse } from 'src/modules/remika-dashboard/types';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    color: THEME.fontPrimary,
    background: THEME.bgPrimary,
    fontFamily: THEME.fontFamily,
    boxSizing: 'border-box',
  } as const,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 12px 8px',
    borderBottom: `1px solid ${THEME.borderLight}`,
  } as const,
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
  } as const,
  title: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const,
  subtitle: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 12,
    lineHeight: 1.25,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const,
  metricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
    padding: 12,
    borderBottom: `1px solid ${THEME.borderLight}`,
  } as const,
  metric: {
    minWidth: 0,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
    padding: 10,
    background: THEME.bgSecondary,
  } as const,
  metricLabel: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 11,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const,
  metricValue: {
    margin: '6px 0 0',
    color: THEME.fontPrimary,
    fontSize: 22,
    fontWeight: 650,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as const,
  content: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 0.7fr) minmax(260px, 1.3fr)',
    flex: 1,
    minHeight: 0,
  } as const,
  pipeline: {
    padding: 12,
    borderRight: `1px solid ${THEME.borderLight}`,
    overflow: 'hidden',
  } as const,
  sectionTitle: {
    margin: '0 0 10px',
    color: THEME.fontSecondary,
    fontSize: 12,
    fontWeight: 600,
  } as const,
  pipelineRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  } as const,
  pipelineRow: {
    display: 'grid',
    gridTemplateColumns: '64px 1fr 28px',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  } as const,
  pipelineLabel: {
    color: THEME.fontTertiary,
    fontSize: 11,
    textTransform: 'capitalize',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  pipelineTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 999,
    background: THEME.bgTertiary,
  } as const,
  pipelineBar: {
    height: '100%',
    minWidth: 2,
    borderRadius: 999,
    background: THEME.blue,
  } as const,
  pipelineValue: {
    color: THEME.fontSecondary,
    fontSize: 11,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  } as const,
  queue: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: 12,
  } as const,
  queueRows: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    minHeight: 0,
    overflow: 'auto',
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
  } as const,
  queueRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(160px, 1fr) minmax(90px, 0.55fr) auto',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    padding: '7px 9px',
    borderBottom: `1px solid ${THEME.borderLight}`,
    background: THEME.bgPrimary,
  } as const,
  queueName: {
    minWidth: 0,
    color: THEME.fontPrimary,
    fontSize: 12,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  queueMeta: {
    marginTop: 2,
    color: THEME.fontTertiary,
    fontSize: 11,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  queueStage: {
    minWidth: 0,
    color: THEME.fontSecondary,
    fontSize: 12,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  state: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    color: THEME.fontTertiary,
    fontSize: 13,
    textAlign: 'center',
  } as const,
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Not synced yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const priorityColor = (priority: 'P0' | 'P1' | 'P2') => {
  if (priority === 'P0') return 'red';
  if (priority === 'P1') return 'orange';

  return 'blue';
};

const Metric = ({ label, value }: { label: string; value: string | number }) => (
  <div style={styles.metric}>
    <p style={styles.metricLabel}>{label}</p>
    <p style={styles.metricValue}>{value}</p>
  </div>
);

const RemikaCrmOverview = () => {
  const [data, setData] = useState<CrmOverviewResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await fetchCrmOverview<CrmOverviewResponse>();

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load Remika CRM data';

        if (!cancelled) {
          setError(message);
          enqueueSnackbar({ message, variant: 'error' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading && !data) {
    return <div style={styles.state}>Loading Remika CRM dashboard...</div>;
  }

  if (error && !data) {
    return (
      <div style={styles.state}>
        <span>{error}</span>
      </div>
    );
  }

  const metrics = data?.metrics;
  const pipelineEntries = Object.entries(data?.pipeline || {});
  const maxPipelineValue = Math.max(
    1,
    ...pipelineEntries.map(([, value]) => value),
  );
  const actionQueue = data?.actionQueue?.slice(0, 8) || [];

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.titleBlock}>
          <h3 style={styles.title}>Remika CRM overview</h3>
          <p style={styles.subtitle}>
            {data?.workspace.name || 'Workspace'} - Updated{' '}
            {formatDateTime(data?.generatedAt)}
          </p>
        </div>
        <Button
          title="Refresh"
          size="small"
          variant="secondary"
          isLoading={loading}
          onClick={() => setReloadKey((value) => value + 1)}
        />
      </div>

      <div style={styles.metricGrid}>
        <Metric label="Open leads" value={metrics?.openLeads ?? 0} />
        <Metric label="Hot leads" value={metrics?.hotLeads ?? 0} />
        <Metric
          label="Active opps"
          value={metrics?.activeOpportunities ?? 0}
        />
        <Metric
          label="Active value"
          value={metrics?.activeDealValueDisplay ?? '$0'}
        />
      </div>

      <div style={styles.content}>
        <section style={styles.pipeline}>
          <p style={styles.sectionTitle}>Pipeline</p>
          {pipelineEntries.length ? (
            <div style={styles.pipelineRows}>
              {pipelineEntries.map(([label, value]) => (
                <div key={label} style={styles.pipelineRow}>
                  <span style={styles.pipelineLabel}>{label}</span>
                  <span style={styles.pipelineTrack}>
                    <span
                      style={{
                        ...styles.pipelineBar,
                        width: `${Math.max(4, (value / maxPipelineValue) * 100)}%`,
                      }}
                    />
                  </span>
                  <span style={styles.pipelineValue}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.state}>No pipeline data</div>
          )}
        </section>

        <section style={styles.queue}>
          <p style={styles.sectionTitle}>Action queue</p>
          {actionQueue.length ? (
            <div style={styles.queueRows}>
              {actionQueue.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    ...styles.queueRow,
                    borderBottom:
                      index === actionQueue.length - 1
                        ? 'none'
                        : styles.queueRow.borderBottom,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.queueName}>{item.clientName}</div>
                    <div style={styles.queueMeta}>
                      {[item.type, item.intent, item.city]
                        .filter(Boolean)
                        .join(' - ')}
                    </div>
                  </div>
                  <div style={styles.queueStage}>
                    {item.stage || item.budget || 'No stage'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Tag
                      color={priorityColor(item.priority)}
                      text={item.priority}
                      weight="medium"
                    />
                    {item.overdue ? (
                      <Status color="red" text="Overdue" weight="medium" />
                    ) : item.dueToday ? (
                      <Status color="orange" text="Today" weight="medium" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.state}>No queued CRM actions</div>
          )}
        </section>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: REMIKA_CRM_OVERVIEW_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Remika CRM overview',
  description: 'Displays Remika CRM metrics, pipeline, and action queue.',
  component: RemikaCrmOverview,
});
