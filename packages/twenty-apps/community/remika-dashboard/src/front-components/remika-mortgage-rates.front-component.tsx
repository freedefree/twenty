import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import { REMIKA_MORTGAGE_RATES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/modules/remika-dashboard/constants';
import { fetchRemikaJson } from 'src/modules/remika-dashboard/remika-api';
import { THEME } from 'src/modules/remika-dashboard/theme';
import { Button } from 'src/modules/remika-dashboard/twenty-ui-primitives';
import { type MortgageRatesResponse } from 'src/modules/remika-dashboard/types';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    color: THEME.fontPrimary,
    background: 'transparent',
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeMd,
    boxSizing: 'border-box',
  } as const,
  rateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
    gap: 8,
  } as const,
  rateCard: {
    minWidth: 0,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusSm,
    padding: '10px 12px',
    background: THEME.bgPrimary,
  } as const,
  rateLabel: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: THEME.fontSizeSm,
    lineHeight: 1.2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  rateValue: {
    margin: '6px 0 0',
    color: THEME.fontPrimary,
    fontSize: THEME.fontSizeXxl,
    fontWeight: THEME.fontWeightSemiBold,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    fontVariantNumeric: 'tabular-nums',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 'auto',
    color: THEME.fontTertiary,
    fontSize: THEME.fontSizeSm,
    minWidth: 0,
  } as const,
  meta: {
    minWidth: 0,
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
    fontSize: THEME.fontSizeSm,
    textAlign: 'center',
  } as const,
};

const formatRate = (rate: number | null | undefined) => {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '-';

  return `${rate.toFixed(2)}%`;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'No date';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const RemikaMortgageRates = () => {
  const [data, setData] = useState<MortgageRatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response =
          await fetchRemikaJson<MortgageRatesResponse>('/api/mortgage-rates');

        if (!cancelled) setData(response);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load Remika mortgage rates';

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
    return <div style={styles.state}>Loading mortgage rates...</div>;
  }

  if (error && !data) {
    return <div style={styles.state}>{error}</div>;
  }

  return (
    <div style={styles.root}>
      <div style={styles.rateGrid}>
        <div style={styles.rateCard}>
          <p style={styles.rateLabel}>30 year fixed</p>
          <p style={styles.rateValue}>{formatRate(data?.term30)}</p>
        </div>
        <div style={styles.rateCard}>
          <p style={styles.rateLabel}>15 year fixed</p>
          <p style={styles.rateValue}>{formatRate(data?.term15)}</p>
        </div>
      </div>

      <div style={styles.footer}>
        <span style={styles.meta}>Updated {formatDate(data?.date)}</span>
        <Button
          title="Refresh"
          size="small"
          variant="secondary"
          isLoading={loading}
          onClick={() => setReloadKey((value) => value + 1)}
        />
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    REMIKA_MORTGAGE_RATES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Remika mortgage rates',
  description: 'Displays Remika mortgage-rate API data inside Twenty.',
  component: RemikaMortgageRates,
});
