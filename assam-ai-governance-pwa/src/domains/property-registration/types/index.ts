export type DocumentType = 'deed' | 'tax_receipt' | 'id_proof' | 'other';

export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'rejected' | 'needs_review';

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'documents_under_review'
  | 'verification_complete'
  | 'awaiting_signature'
  | 'registered'
  | 'rejected';

export interface Document {
  id: string;
  type: DocumentType;
  fileName: string;
  uploadedAt: string;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  ocrExtracted?: Record<string, string>;
  anomalyFlags?: string[];
}

export interface PropertyDetails {
  type: 'flat' | 'apartment';
  address: string;
  district: string;
  area_sqft: number;
  price_inr: number;
  registrationDistrict: string;
}

export interface Party {
  name: string;
  aadhaarLast4: string;
  phone: string;
  email: string;
  role: 'buyer' | 'seller';
}

export interface RegistrationApplication {
  id: string;
  applicationNumber: string;
  status: ApplicationStatus;
  property: PropertyDetails;
  buyer: Party;
  seller: Party;
  documents: Document[];
  submittedAt: string;
  estimatedCompletion: string;
  governmentFee_inr: number;
  stampDuty_inr: number;
  statusHistory: StatusEntry[];
}

export interface StatusEntry {
  status: ApplicationStatus;
  timestamp: string;
  note?: string;
}
