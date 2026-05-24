export type CrmOverviewResponse = {
  success: boolean;
  data: {
    generatedAt?: string;
    workspace: {
      id: string;
      name: string;
      slug?: string | null;
      role: string | null;
      canManage?: boolean;
    };
    metrics: {
      totalLeads: number;
      openLeads: number;
      hotLeads: number;
      newLeads7d: number;
      overdueTasks: number;
      dueTodayTasks: number;
      pendingDrafts: number;
      totalContacts: number;
      activeOpportunities: number;
      activeDealValue?: number;
      activeDealValueDisplay: string;
    };
    pipeline?: Record<string, number>;
    actionQueue?: Array<{
      id: string;
      type: 'lead' | 'opportunity';
      clientName: string;
      contact: string | null;
      intent: string | null;
      city: string | null;
      budget: string | null;
      stage: string;
      score: number | null;
      priority: 'P0' | 'P1' | 'P2';
      overdue: boolean;
      dueToday: boolean;
      missingTask: boolean;
      stale7d: boolean;
      nextActionAt: string | null;
      recommendedStrategy: string | null;
    }>;
  };
};

export type {
  CrmNextAction,
  CrmNextActionDetailData,
  CrmNextActionDetailResponse,
  CrmNextActionDraftResponse,
  CrmNextActionExecutionState,
  CrmNextActionHandoffIdentityInput,
  CrmNextActionIdentityInput,
  CrmNextActionPermissions,
  CrmNextActionReviewEvent,
  CrmNextActionReviewStatus,
  CrmNextActionSnapshot,
  CrmNextActionSyncState,
  CrmNextActionsResponse,
  CrmNextActionTaskResponse,
} from '../../../../../../../../../shared/crm/next-actions';

export type {
  CrmClientActivitySnapshot,
  CrmClientActivityTargetType,
  CrmClientActivityTwentySafeResponse,
  CrmClientActivityTwentySafeSnapshot,
} from '../../../../../../../../../shared/crm/client-activity';

export type CrmContactImportMatchType =
  | 'consumer_user_id'
  | 'email'
  | 'phone';

export type CrmContactImportSuggestedAction =
  | 'already_linked'
  | 'create_new'
  | 'link_to_existing'
  | 'merge_required';

export type CrmContactImportOperation = 'create' | 'link' | 'merge';

export type CrmContactImportProfileSummary = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string | null;
  appSource: string | null;
  preferredLocale: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrmContactImportContactSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  contactRole: string | null;
  source: string | null;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  consumerUserId: string | null;
  companyId: string | null;
  updatedAt: string | null;
};

export type CrmContactImportMatchSummary = {
  contact: CrmContactImportContactSummary;
  matchTypes: CrmContactImportMatchType[];
};

export type CrmContactImportCandidateSummary = {
  profile: CrmContactImportProfileSummary;
  linkedContact: CrmContactImportContactSummary | null;
  matches: CrmContactImportMatchSummary[];
  suggestedAction: CrmContactImportSuggestedAction;
  suggestedTargetContactId: string | null;
};

export type CrmContactImportCandidatesData = {
  page: number;
  pageSize: number;
  total: number;
  rows: CrmContactImportCandidateSummary[];
  organizationId: string;
};

export type CrmContactImportCandidatesResponse = {
  success: boolean;
  data: CrmContactImportCandidatesData;
};

export type CrmContactImportActionResult = {
  profileId: string;
  actionTaken: CrmContactImportOperation | 'already_linked';
  contactId: string;
  targetContactId: string | null;
  sourceContactId: string | null;
  organizationId: string;
  merged: boolean;
  created: boolean;
};

export type CrmContactImportActionResponse = {
  success: boolean;
  data: CrmContactImportActionResult;
};

export type MortgageRatesResponse = {
  term30: number | null;
  term15: number | null;
  date?: string | null;
  source?: string;
};
