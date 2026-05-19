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

export type MortgageRatesResponse = {
  term30: number | null;
  term15: number | null;
  date?: string | null;
  source?: string;
};

