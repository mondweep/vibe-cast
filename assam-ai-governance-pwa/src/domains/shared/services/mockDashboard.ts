import type { DashboardStats } from '../types';

export const mockDashboardStats: DashboardStats = {
  propertyRegistration: {
    totalApplications: 1247,
    pendingReview: 89,
    completedToday: 23,
    avgProcessingDays: 6.2,
    remoteAdoptionPercent: 78,
    verificationAccuracy: 96.3,
  },
  costAuditing: {
    totalEstimates: 342,
    flaggedEstimates: 47,
    savingsThisMonth_crore: 8.4,
    avgApprovalDays: 3.8,
    fraudDetectionRate: 83,
    falsePositiveRate: 3.2,
  },
};

export const monthlyTrends = {
  labels: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'],
  registrations: [142, 198, 267, 312, 389, 423],
  savings_crore: [2.1, 3.8, 5.2, 6.1, 7.3, 8.4],
  flaggedPercent: [18, 15, 12, 9, 7, 5.8],
  processingDays: [22, 18, 14, 10, 7.5, 6.2],
};
