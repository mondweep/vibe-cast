export interface User {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
  district?: string;
}

export type UserRole = 'citizen' | 'engineer' | 'supervisor' | 'executive' | 'admin';

export interface DashboardStats {
  propertyRegistration: {
    totalApplications: number;
    pendingReview: number;
    completedToday: number;
    avgProcessingDays: number;
    remoteAdoptionPercent: number;
    verificationAccuracy: number;
  };
  costAuditing: {
    totalEstimates: number;
    flaggedEstimates: number;
    savingsThisMonth_crore: number;
    avgApprovalDays: number;
    fraudDetectionRate: number;
    falsePositiveRate: number;
  };
}

export type Language = 'en' | 'hi' | 'as';
