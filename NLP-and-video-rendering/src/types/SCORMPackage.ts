/**
 * Type definitions for SCORM package generation
 */

export interface SCORMConfig {
  version: '1.2' | '2004';
  masteryScore: number;
  enableBookmarking: boolean;
  enableTracking: boolean;
  completionThreshold?: number;
}

export interface SCOItem {
  identifier: string;
  title: string;
  type: 'sco' | 'asset';
  href: string;
  prerequisites?: string[];
  masteryScore?: number;
  maxTimeAllowed?: string;
  timeLimitAction?: string;
}

export interface SCORMResource {
  identifier: string;
  type: 'webcontent';
  href: string;
  files: string[];
}

export interface SCORMOrganization {
  identifier: string;
  title: string;
  items: SCOItem[];
}

export interface SCORMManifest {
  identifier: string;
  version: string;
  metadata: {
    schema: string;
    schemaversion: string;
    title: string;
    description?: string;
  };
  organizations: SCORMOrganization[];
  resources: SCORMResource[];
}

export interface SCORMPackage {
  manifest: SCORMManifest;
  files: {
    path: string;
    content: Buffer | string;
  }[];
  playerHTML: string;
  scormAPI: string;
  config: SCORMConfig;
}

export interface ValidationResult {
  manifestValid: boolean;
  resourcesComplete: boolean;
  apiImplemented: boolean;
  accessibilityCompliant: boolean;
  errors: string[];
  warnings: string[];
}
