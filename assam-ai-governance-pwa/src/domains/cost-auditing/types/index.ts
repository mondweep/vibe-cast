export type ProjectType =
  | '2-lane-asphalt'
  | '4-lane-asphalt'
  | '2-lane-concrete'
  | '4-lane-concrete'
  | 'bridge'
  | 'culvert';

export type RiskLevel = 'green' | 'yellow' | 'red';

export type ApprovalStatus = 'pending' | 'auto_approved' | 'under_review' | 'approved' | 'rejected' | 'investigation';

export interface CostEstimate {
  id: string;
  projectName: string;
  projectType: ProjectType;
  district: string;
  location: string;
  lengthKm: number;
  widthM: number;
  estimatedCost_inr: number;
  baselineCost_inr: number;
  costRatio: number;
  riskLevel: RiskLevel;
  approvalStatus: ApprovalStatus;
  submittedBy: string;
  submittedAt: string;
  justification?: string;
  materialBreakdown: MaterialCost[];
  aiAnalysis: AIAnalysis;
  auditTrail: AuditEntry[];
}

export interface MaterialCost {
  material: string;
  quantity: number;
  unit: string;
  unitPrice_inr: number;
  totalCost_inr: number;
  marketRate_inr: number;
  variance_percent: number;
}

export interface AIAnalysis {
  overallScore: number;
  baselineCostPerKm: number;
  adjustedBaseline: number;
  similarProjects: SimilarProject[];
  suspiciousLineItems: string[];
  explanation: string;
}

export interface SimilarProject {
  name: string;
  year: number;
  costPerKm: number;
  lengthKm: number;
  district: string;
}

export interface AuditEntry {
  action: string;
  actor: string;
  timestamp: string;
  notes?: string;
}

export interface HistoricalProject {
  id: string;
  name: string;
  type: ProjectType;
  district: string;
  lengthKm: number;
  estimatedCost_inr: number;
  actualCost_inr: number;
  completionYear: number;
  costPerKm: number;
}
