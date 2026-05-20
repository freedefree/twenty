import { useEffect, useMemo, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { enqueueSnackbar } from 'twenty-sdk/front-component';

import {
  REMIKA_CONTACT_IMPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  CRM_CONTACT_ROLE_VALUES,
  type CrmContactRoleValue,
} from 'src/modules/remika-dashboard/constants';
import {
  fetchCrmImportCandidates,
  importCrmContactFromProfile,
} from 'src/modules/remika-dashboard/remika-api';
import { THEME } from 'src/modules/remika-dashboard/theme';
import {
  Button,
  Status,
  Tag,
} from 'src/modules/remika-dashboard/twenty-ui-primitives';
import {
  type CrmContactImportActionResponse,
  type CrmContactImportCandidateSummary,
  type CrmContactImportCandidatesResponse,
  type CrmContactImportSuggestedAction,
} from 'src/modules/remika-dashboard/types';

const CONTACT_ROLE_OPTIONS: Array<{ value: CrmContactRoleValue; label: string }> =
  CRM_CONTACT_ROLE_VALUES.map(value => ({
    value,
    label: value
      .split('_')
      .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' '),
  })).map(option => ({
    ...option,
    label:
      option.value === 'agent_internal'
        ? 'Internal agent'
        : option.value === 'agent_external'
          ? 'External agent'
          : option.label,
  }));

const IMPORT_STATUS_OPTIONS: Array<{
  value: 'all' | 'unlinked' | 'linked' | 'conflict';
  label: string;
}> = [
  { value: 'unlinked', label: 'Unlinked' },
  { value: 'conflict', label: 'Conflict' },
  { value: 'linked', label: 'Linked' },
  { value: 'all', label: 'All' },
];

const ACTION_META: Record<
  CrmContactImportSuggestedAction,
  { label: string; color: 'blue' | 'green' | 'orange' | 'red' }
> = {
  already_linked: { label: 'Already linked', color: 'green' },
  create_new: { label: 'Create new', color: 'blue' },
  link_to_existing: { label: 'Link to existing', color: 'orange' },
  merge_required: { label: 'Merge required', color: 'red' },
};

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
    flexDirection: 'column',
    gap: 8,
    padding: '12px 12px 10px',
    borderBottom: `1px solid ${THEME.borderLight}`,
  } as const,
  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
    fontSize: 15,
    fontWeight: 650,
    lineHeight: 1.25,
  } as const,
  subtitle: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 12,
    lineHeight: 1.3,
  } as const,
  metaBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  } as const,
  controls: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 1.5fr) minmax(120px, 0.8fr) minmax(140px, 1fr) auto',
    gap: 8,
    alignItems: 'center',
  } as const,
  input: {
    width: '100%',
    border: `1px solid ${THEME.borderMedium}`,
    borderRadius: THEME.radiusSm,
    background: THEME.bgSecondary,
    color: THEME.fontPrimary,
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeSm,
    lineHeight: '20px',
    padding: '6px 8px',
    outline: 'none',
  } as const,
  select: {
    width: '100%',
    border: `1px solid ${THEME.borderMedium}`,
    borderRadius: THEME.radiusSm,
    background: THEME.bgSecondary,
    color: THEME.fontPrimary,
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeSm,
    lineHeight: '20px',
    padding: '6px 8px',
    outline: 'none',
  } as const,
  body: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flex: 1,
    overflow: 'hidden',
  } as const,
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '10px 12px 0',
  } as const,
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flex: 1,
    minHeight: 0,
    padding: 12,
    overflow: 'auto',
  } as const,
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusMd,
    padding: 12,
    background: THEME.bgPrimary,
  } as const,
  cardHeader: {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1.2fr) minmax(200px, 0.9fr) minmax(180px, 0.8fr)',
    gap: 10,
    alignItems: 'start',
  } as const,
  nameBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  } as const,
  candidateName: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 13,
    fontWeight: 650,
    lineHeight: 1.25,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  candidateMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  } as const,
  candidateContact: {
    color: THEME.fontSecondary,
    fontSize: 12,
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  candidateInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    minWidth: 0,
  } as const,
  candidateLabel: {
    margin: 0,
    color: THEME.fontTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  } as const,
  candidateValue: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 12,
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  candidateBody: {
    display: 'grid',
    gridTemplateColumns: '1.1fr 0.9fr 1.1fr',
    gap: 10,
    alignItems: 'start',
  } as const,
  matchPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
  } as const,
  matchList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minHeight: 0,
  } as const,
  matchItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    border: `1px solid ${THEME.borderLight}`,
    borderRadius: THEME.radiusSm,
    padding: 8,
    background: THEME.bgSecondary,
  } as const,
  matchTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
    minWidth: 0,
  } as const,
  matchName: {
    margin: 0,
    color: THEME.fontPrimary,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.25,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
  matchMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  } as const,
  actionPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 0,
  } as const,
  actionSelect: {
    width: '100%',
    border: `1px solid ${THEME.borderMedium}`,
    borderRadius: THEME.radiusSm,
    background: THEME.bgSecondary,
    color: THEME.fontPrimary,
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeSm,
    lineHeight: '20px',
    padding: '6px 8px',
    outline: 'none',
  } as const,
  actionButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  } as const,
  actionButton: {
    border: `1px solid ${THEME.borderMedium}`,
    borderRadius: THEME.radiusSm,
    background: THEME.bgSecondary,
    color: THEME.fontSecondary,
    fontFamily: THEME.fontFamily,
    fontSize: THEME.fontSizeSm,
    fontWeight: THEME.fontWeightMedium,
    height: 28,
    lineHeight: '26px',
    padding: '0 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  } as const,
  actionButtonPrimary: {
    border: `1px solid ${THEME.blue}`,
    color: THEME.blue,
  } as const,
  actionButtonDanger: {
    border: `1px solid ${THEME.red}`,
    color: THEME.red,
  } as const,
  statusRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
  } as const,
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '0 12px 12px',
    borderTop: `1px solid ${THEME.borderLight}`,
  } as const,
  footerMeta: {
    color: THEME.fontTertiary,
    fontSize: 12,
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
} as const;

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

const capitalize = (value: string) =>
  value
    .split('_')
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');

const getActionTitle = (action: CrmContactImportSuggestedAction) => {
  if (action === 'create_new') return 'Create new People';
  if (action === 'merge_required') return 'Merge into selected People';
  if (action === 'link_to_existing') return 'Link to selected People';

  return 'Already linked';
};

const getActionVariantStyle = (action: CrmContactImportSuggestedAction) => {
  const color = ACTION_META[action].color;
  if (color === 'green') return styles.actionButtonPrimary;
  if (color === 'red') return styles.actionButtonDanger;

  return styles.actionButton;
};

const CandidateMatch = ({
  candidate,
}: {
  candidate: CrmContactImportCandidateSummary['matches'][number];
}) => (
  <div style={styles.matchItem}>
    <div style={styles.matchTitle}>
      <p style={styles.matchName}>
        {candidate.contact.name || candidate.contact.email || candidate.contact.id}
      </p>
      <Tag color="blue" text={candidate.contact.contactRole || 'client'} />
    </div>
    <div style={styles.matchMeta}>
      {candidate.matchTypes.map(matchType => (
        <Tag key={matchType} color="orange" text={matchType} />
      ))}
    </div>
    <p style={{ ...styles.candidateValue, color: THEME.fontTertiary }}>
      {candidate.contact.email || 'No email'} · {candidate.contact.phone || 'No phone'}
    </p>
  </div>
);

const RemikaContactImport = () => {
  const [data, setData] = useState<CrmContactImportCandidatesResponse['data'] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'unlinked' | 'linked' | 'conflict'>(
    'unlinked',
  );
  const [selectedRole, setSelectedRole] = useState<CrmContactRoleValue>('client');
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const response = await fetchCrmImportCandidates<CrmContactImportCandidatesResponse>(
          {
            page: String(page),
            pageSize: '10',
            search: search || undefined,
            status,
          },
        );

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load import candidates';
        if (!cancelled) {
          setError(message);
          enqueueSnackbar({ message, variant: 'error' });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, reloadKey, search, status]);

  useEffect(() => {
    if (!data) return;

    setSelectedTargets(current => {
      let changed = false;
      const next = { ...current };

      for (const candidate of data.rows) {
        if (next[candidate.profile.id]) continue;

        const defaultTarget =
          candidate.suggestedTargetContactId ||
          candidate.matches[0]?.contact.id ||
          '';
        next[candidate.profile.id] = defaultTarget;
        changed = true;
      }

      return changed ? next : current;
    });
  }, [data]);

  const totalPages = useMemo(() => {
    if (!data || data.pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const handleSearchSubmit = () => {
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleRefresh = () => setReloadKey(value => value + 1);

  const handleImport = async (
    candidate: CrmContactImportCandidateSummary,
    action: 'create' | 'link' | 'merge',
  ) => {
    setBusyProfileId(candidate.profile.id);

    try {
      const targetContactId =
        selectedTargets[candidate.profile.id] ||
        candidate.suggestedTargetContactId ||
        candidate.matches[0]?.contact.id ||
        null;

      const response = await importCrmContactFromProfile<CrmContactImportActionResponse>({
        profileId: candidate.profile.id,
        action,
        targetContactId: action === 'create' ? null : targetContactId,
        contactRole: selectedRole,
        source: 'twenty_remika_import_widget',
      });

      const label = action === 'create' ? 'created' : response.data.merged ? 'merged' : 'linked';
      enqueueSnackbar({
        message: `${candidate.profile.email} ${label} into People #${response.data.contactId.slice(0, 8)}`,
        variant: 'success',
      });
      setReloadKey(value => value + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import CRM contact';
      enqueueSnackbar({ message, variant: 'error' });
    } finally {
      setBusyProfileId(null);
    }
  };

  const renderBody = () => {
    if (loading && !data) {
      return <div style={styles.state}>Loading import candidates...</div>;
    }

    if (error && !data) {
      return <div style={styles.state}>{error}</div>;
    }

    if (!data || data.rows.length === 0) {
      return (
        <div style={styles.state}>
          No import candidates match the current filter.
        </div>
      );
    }

    return (
      <div style={styles.list}>
        {data.rows.map(candidate => {
          const suggestedAction = candidate.suggestedAction;
          const actionLabel = getActionTitle(suggestedAction);
          const actionStyle = getActionVariantStyle(suggestedAction);
          const busy = busyProfileId === candidate.profile.id;
          const canCreate = suggestedAction === 'create_new';
          const targetOptions = candidate.matches;
          const selectedTargetId =
            selectedTargets[candidate.profile.id] ||
            candidate.suggestedTargetContactId ||
            candidate.matches[0]?.contact.id ||
            '';

          return (
            <div key={candidate.profile.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.nameBlock}>
                  <p style={styles.candidateName}>
                    {candidate.profile.name || candidate.profile.email}
                  </p>
                  <div style={styles.candidateMeta}>
                    <Tag color={ACTION_META[suggestedAction].color} text={actionLabel} />
                    <Tag color="blue" text={candidate.profile.appSource || 'app'} />
                    <Tag color="green" text={candidate.profile.role || 'profile'} />
                  </div>
                  <p style={styles.candidateContact}>
                    {candidate.profile.email}
                    {candidate.profile.phone ? ` · ${candidate.profile.phone}` : ''}
                  </p>
                </div>

                <div style={styles.candidateInfo}>
                  <p style={styles.candidateLabel}>Linked People</p>
                  <p style={styles.candidateValue}>
                    {candidate.linkedContact
                      ? candidate.linkedContact.name ||
                        candidate.linkedContact.email ||
                        candidate.linkedContact.id
                      : 'Not linked yet'}
                  </p>
                  <p style={styles.candidateValue}>
                    Updated {formatDateTime(candidate.profile.updatedAt)}
                  </p>
                </div>

                <div style={styles.candidateInfo}>
                  <p style={styles.candidateLabel}>Selected role</p>
                  <select
                    aria-label={`CRM contact role for ${candidate.profile.email}`}
                    style={styles.select}
                    value={selectedRole}
                    onChange={event =>
                      setSelectedRole(event.currentTarget.value as CrmContactRoleValue)
                    }
                  >
                    {CONTACT_ROLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p style={styles.candidateValue}>
                    This role is written to {`crm.contacts.contact_role`}.
                  </p>
                </div>
              </div>

              <div style={styles.candidateBody}>
                <div style={styles.matchPanel}>
                  <p style={styles.candidateLabel}>Matches</p>
                  {targetOptions.length === 0 ? (
                    <p style={styles.candidateValue}>No existing People found.</p>
                  ) : (
                    <div style={styles.matchList}>
                      {targetOptions.map(match => (
                        <CandidateMatch key={match.contact.id} candidate={match} />
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.actionPanel}>
                  <p style={styles.candidateLabel}>Target People</p>
                  {targetOptions.length > 0 ? (
                    <select
                      aria-label={`Target People for ${candidate.profile.email}`}
                      style={styles.actionSelect}
                      value={selectedTargetId}
                      onChange={event =>
                        setSelectedTargets(current => ({
                          ...current,
                          [candidate.profile.id]: event.currentTarget.value,
                        }))
                      }
                    >
                      {targetOptions.map(match => (
                        <option key={match.contact.id} value={match.contact.id}>
                          {match.contact.name ||
                            match.contact.email ||
                            match.contact.id}
                          {' · '}
                          {match.matchTypes.join(', ')}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p style={styles.candidateValue}>Will create a new People record.</p>
                  )}

                  <div style={styles.actionButtons}>
                    {canCreate ? (
                      <button
                        style={{ ...styles.actionButton, ...actionStyle }}
                        type="button"
                        disabled={busy}
                        onClick={() => handleImport(candidate, 'create')}
                      >
                        {busy ? 'Creating...' : actionLabel}
                      </button>
                    ) : suggestedAction === 'already_linked' ? (
                      <div style={styles.statusRow}>
                        <Status color="green" text="Already linked" weight="medium" />
                      </div>
                    ) : (
                      <button
                        style={{ ...styles.actionButton, ...actionStyle }}
                        type="button"
                        disabled={busy || !selectedTargetId}
                        onClick={() =>
                          handleImport(
                            candidate,
                            suggestedAction === 'merge_required' ? 'merge' : 'link',
                          )
                        }
                      >
                        {busy ? 'Saving...' : actionLabel}
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.matchPanel}>
                  <p style={styles.candidateLabel}>Summary</p>
                  <p style={styles.candidateValue}>
                    Role preference: {capitalize(selectedRole)} ·
                    {candidate.matches.length} match
                    {candidate.matches.length === 1 ? '' : 'es'}
                  </p>
                  <p style={styles.candidateValue}>
                    Consumer user bridge:{' '}
                    {candidate.profile.id === candidate.linkedContact?.consumerUserId
                      ? 'linked'
                      : candidate.linkedContact
                        ? 'linked through People'
                        : 'unlinked'}
                  </p>
                  <div style={styles.metaBar}>
                    <Tag
                      color={ACTION_META[suggestedAction].color}
                      text={ACTION_META[suggestedAction].label}
                    />
                    <Tag
                      color="orange"
                      text={`${candidate.matches.length} candidate${candidate.matches.length === 1 ? '' : 's'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div style={styles.titleBlock}>
            <h2 style={styles.title}>Remika contact import</h2>
            <p style={styles.subtitle}>
              Pull registered users from Remika, then create, link, or merge them into
              Twenty People records without touching Twenty core.
            </p>
          </div>
          <Button title="Refresh" isLoading={loading} onClick={handleRefresh} />
        </div>

        <div style={styles.controls}>
          <input
            aria-label="Search import candidates"
            placeholder="Search name, email, or phone"
            style={styles.input}
            value={searchDraft}
            onChange={event => setSearchDraft(event.currentTarget.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') handleSearchSubmit();
            }}
          />

          <select
            aria-label="Import status filter"
            style={styles.select}
            value={status}
            onChange={event =>
              setStatus(event.currentTarget.value as 'all' | 'unlinked' | 'linked' | 'conflict')
            }
          >
            {IMPORT_STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Default import role"
            style={styles.select}
            value={selectedRole}
            onChange={event =>
              setSelectedRole(event.currentTarget.value as CrmContactRoleValue)
            }
          >
            {CONTACT_ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <Button title="Search" onClick={handleSearchSubmit} />
        </div>
      </div>

      <div style={styles.body}>
        <div style={styles.summary}>
          <Tag color="blue" text={`Page ${data?.page || page}`} />
          <Tag color="green" text={`Total ${data?.total || 0}`} />
          <Tag color="orange" text={`Role ${capitalize(selectedRole)}`} />
          <Tag color="red" text={`Filter ${status}`} />
        </div>

        {renderBody()}

        <div style={styles.footer}>
          <div style={styles.footerMeta}>
            {data ? `Showing ${data.rows.length} of ${data.total} candidates` : 'No data yet'}
          </div>
          <div style={styles.actionButtons}>
            <Button
              title="Previous"
              isLoading={loading}
              onClick={() => setPage(current => Math.max(1, current - 1))}
            />
            <Button
              title="Next"
              isLoading={loading}
              onClick={() => setPage(current => Math.min(totalPages, current + 1))}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier:
    REMIKA_CONTACT_IMPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Remika contact import',
  description:
    'Selective import and merge of Remika registered users into Twenty People records.',
  component: RemikaContactImport,
});
