import { useEffect, useMemo, useRef, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds } from 'twenty-sdk/front-component';

import { REMIKA_PROPERTY_SEARCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/modules/remika-dashboard/constants';
import { buildRemikaEmbeddedPropertySearchUrl } from 'src/modules/remika-dashboard/remika-api';
import { THEME } from 'src/modules/remika-dashboard/theme';
import { Status } from 'src/modules/remika-dashboard/twenty-ui-primitives';

type TransactionType = 'sale' | 'sold' | 'rent';
type RelationTargetType = 'contact' | 'opportunity' | null;
type FrameState = 'loading' | 'loaded' | 'ready';

type SearchRelationContext = {
  clientId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  clientName?: string | null;
};

const READY_MESSAGE_TYPE = 'remika:crm-search:ready';
const VISIBLE_FALLBACK_MS = 3000;

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: 680,
    overflow: 'hidden',
    color: THEME.fontPrimary,
    background: THEME.bgPrimary,
    fontFamily: THEME.fontFamily,
    boxSizing: 'border-box',
  } as const,
  header: {
    alignItems: 'center',
    borderBottom: `1px solid ${THEME.borderLight}`,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    padding: '8px 10px',
  } as const,
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  } as const,
  title: {
    color: THEME.fontPrimary,
    fontSize: 13,
    fontWeight: THEME.fontWeightSemiBold,
    lineHeight: 1.2,
    margin: 0,
  } as const,
  subtitle: {
    color: THEME.fontTertiary,
    fontSize: 11,
    lineHeight: 1.25,
    margin: 0,
  } as const,
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  } as const,
  segmented: {
    alignItems: 'center',
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusSm,
    display: 'inline-flex',
    overflow: 'hidden',
  } as const,
  segment: {
    border: 0,
    borderRight: `1px solid ${THEME.borderLight}`,
    color: THEME.fontSecondary,
    cursor: 'pointer',
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeSm,
    height: 28,
    lineHeight: '28px',
    padding: '0 9px',
    whiteSpace: 'nowrap',
  } as const,
  segmentLast: {
    borderRight: 0,
  } as const,
  segmentActive: {
    background: THEME.bgTransparentLight,
    color: THEME.fontPrimary,
    fontWeight: THEME.fontWeightMedium,
  } as const,
  button: {
    alignItems: 'center',
    border: `1px solid ${THEME.borderMedium}`,
    borderRadius: THEME.radiusSm,
    background: THEME.bgSecondary,
    color: THEME.fontSecondary,
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeSm,
    fontWeight: THEME.fontWeightMedium,
    height: 30,
    justifyContent: 'center',
    lineHeight: '28px',
    padding: '0 10px',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  } as const,
  frameShell: {
    flex: 1,
    minHeight: 560,
    overflow: 'hidden',
    position: 'relative',
  } as const,
  contextBar: {
    alignItems: 'center',
    background: THEME.bgSecondary,
    borderBottom: `1px solid ${THEME.borderLight}`,
    color: THEME.fontTertiary,
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: 11,
    gap: 8,
    padding: '6px 10px',
  } as const,
  contextToken: {
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: 999,
    color: THEME.fontSecondary,
    display: 'inline-flex',
    lineHeight: '18px',
    maxWidth: 260,
    overflow: 'hidden',
    padding: '0 8px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  frame: {
    background: THEME.bgPrimary,
    border: 0,
    display: 'block',
    height: '100%',
    width: '100%',
  } as const,
  loading: {
    alignItems: 'center',
    background: THEME.bgPrimary,
    color: THEME.fontTertiary,
    display: 'flex',
    fontSize: 13,
    inset: 0,
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
    transition: 'opacity 160ms ease',
  } as const,
};

const TRANSACTION_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: 'sale', label: 'For sale' },
  { value: 'rent', label: 'For rent' },
  { value: 'sold', label: 'Sold' },
];

const safeSearchParam = (params: URLSearchParams, key: string) => {
  const value = params.get(key)?.trim();

  return value || null;
};

const getWindowOrigin = () => {
  if (typeof window === 'undefined') return undefined;

  return window.location.origin;
};

const getUrlOrigin = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const isReadyMessage = (data: unknown) =>
  Boolean(
    data &&
      typeof data === 'object' &&
      'type' in data &&
      data.type === READY_MESSAGE_TYPE,
  );

const getFrameStatus = (frameState: FrameState) => {
  if (frameState === 'ready') {
    return { color: 'green', text: 'Search ready' };
  }

  if (frameState === 'loaded') {
    return { color: 'blue', text: 'Search visible' };
  }

  return { color: 'orange', text: 'Loading search' };
};

const getRelationLabel = (relationContext: SearchRelationContext) => {
  if (relationContext.clientName) {
    return `Client: ${relationContext.clientName}`;
  }

  if (relationContext.contactId) {
    return `Contact: ${relationContext.contactId}`;
  }

  if (relationContext.opportunityId) {
    return `Opportunity: ${relationContext.opportunityId}`;
  }

  return 'No CRM record selected';
};

const readRelationContextFromUrl = (): SearchRelationContext & {
  selectedRecordTarget: RelationTargetType;
} => {
  if (typeof window === 'undefined') return { selectedRecordTarget: null };

  const params = new URLSearchParams(window.location.search);
  const selectedRecordTarget = safeSearchParam(
    params,
    'remikaSelectedRecordTarget',
  ) as RelationTargetType;

  return {
    clientId: safeSearchParam(params, 'clientId'),
    contactId: safeSearchParam(params, 'contactId'),
    opportunityId: safeSearchParam(params, 'opportunityId'),
    clientName: safeSearchParam(params, 'clientName'),
    selectedRecordTarget:
      selectedRecordTarget === 'contact' ||
      selectedRecordTarget === 'opportunity'
        ? selectedRecordTarget
        : null,
  };
};

const mergeSelectedRecordContext = (
  urlContext: SearchRelationContext & {
    selectedRecordTarget: RelationTargetType;
  },
  selectedRecordIds: string[],
): SearchRelationContext => {
  if (selectedRecordIds.length !== 1 || !urlContext.selectedRecordTarget) {
    return urlContext;
  }

  const selectedRecordId = selectedRecordIds[0];

  if (urlContext.selectedRecordTarget === 'contact') {
    return {
      ...urlContext,
      contactId: urlContext.contactId || selectedRecordId,
    };
  }

  return {
    ...urlContext,
    opportunityId: urlContext.opportunityId || selectedRecordId,
  };
};

const RemikaPropertySearch = () => {
  const selectedRecordIds = useSelectedRecordIds();
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [transactionType, setTransactionType] =
    useState<TransactionType>('sale');
  const [reloadKey, setReloadKey] = useState(0);
  const [frameState, setFrameState] = useState<FrameState>('loading');

  const parentOrigin = useMemo(() => getWindowOrigin(), []);

  const relationContext = useMemo(
    () =>
      mergeSelectedRecordContext(
        readRelationContextFromUrl(),
        selectedRecordIds,
      ),
    [selectedRecordIds],
  );

  const iframeUrl = useMemo(
    () =>
      buildRemikaEmbeddedPropertySearchUrl({
        transactionType,
        parentOrigin,
        ...relationContext,
      }),
    [parentOrigin, relationContext, transactionType],
  );
  const frameKey = `${transactionType}-${reloadKey}`;
  const expectedFrameOrigin = useMemo(() => getUrlOrigin(iframeUrl), [iframeUrl]);
  const frameStatus = getFrameStatus(frameState);
  const relationLabel = getRelationLabel(relationContext);

  useEffect(() => {
    setFrameState('loading');

    const visibleFallbackTimer = setTimeout(() => {
      setFrameState((currentState) =>
        currentState === 'ready' ? currentState : 'loaded',
      );
    }, VISIBLE_FALLBACK_MS);

    return () => clearTimeout(visibleFallbackTimer);
  }, [frameKey, iframeUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const isExpectedOrigin =
        Boolean(expectedFrameOrigin) && event.origin === expectedFrameOrigin;
      const isExpectedFrame =
        Boolean(frameRef.current?.contentWindow) &&
        event.source === frameRef.current?.contentWindow;

      if (!isExpectedOrigin && !isExpectedFrame) return;
      if (!isReadyMessage(event.data)) return;

      setFrameState('ready');
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [expectedFrameOrigin]);

  const reload = () => {
    setFrameState('loading');
    setReloadKey((key) => key + 1);
  };

  const changeTransactionType = (value: TransactionType) => {
    setFrameState('loading');
    setTransactionType(value);
  };

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={styles.titleBlock}>
          <h2 style={styles.title}>Remika search workspace</h2>
          <p style={styles.subtitle}>
            Full Remika search UI embedded in Twenty: map, filters, cards, split
            view, grid, and table.
          </p>
        </div>

        <div style={styles.actions}>
          <Status color="green" text="Full workspace" weight="medium" />
          <Status
            color={frameStatus.color}
            text={frameStatus.text}
            weight="medium"
          />
          <Status
            color={
              relationContext.contactId || relationContext.opportunityId
                ? 'blue'
                : 'orange'
            }
            text={
              relationContext.contactId
                ? 'Contact-linked'
                : relationContext.opportunityId
                  ? 'Opportunity-linked'
                  : 'Agent private'
            }
            weight="medium"
          />
          <div
            aria-label="Transaction type"
            role="group"
            style={styles.segmented}
          >
            {TRANSACTION_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                onClick={() => changeTransactionType(option.value)}
                style={{
                  ...styles.segment,
                  ...(index === TRANSACTION_OPTIONS.length - 1
                    ? styles.segmentLast
                    : {}),
                  ...(transactionType === option.value
                    ? styles.segmentActive
                    : {}),
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button onClick={reload} style={styles.button} type="button">
            Reload
          </button>
          <a
            href={iframeUrl}
            rel="noreferrer"
            style={styles.button}
            target="_blank"
          >
            Open full page
          </a>
        </div>
      </header>

      <div style={styles.contextBar}>
        <span style={styles.contextToken}>{relationLabel}</span>
        <span style={styles.contextToken}>
          Origin: {expectedFrameOrigin || 'unknown'}
        </span>
        <span>
          Save searches, favorites, and saved articles remain synced with Remika
          CRM objects. If the frame is blank, use Reload or Open full page with
          the same context.
        </span>
      </div>

      <div style={styles.frameShell}>
        <iframe
          allow="clipboard-read; clipboard-write; fullscreen; geolocation"
          key={frameKey}
          onLoad={() =>
            setFrameState((currentState) =>
              currentState === 'ready' ? currentState : 'loaded',
            )
          }
          referrerPolicy="strict-origin-when-cross-origin"
          ref={frameRef}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          src={iframeUrl}
          style={styles.frame}
          title="Remika full property search"
        />
        <div
          style={{
            ...styles.loading,
            opacity: frameState === 'loading' ? 1 : 0,
          }}
        >
          Loading full Remika search workspace...
        </div>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    REMIKA_PROPERTY_SEARCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Remika search workspace',
  description:
    'Embeds the full Remika search workspace in Twenty with map, filters, cards, grid, split, and table views.',
  component: RemikaPropertySearch,
});
