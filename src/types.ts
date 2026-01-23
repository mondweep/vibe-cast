/**
 * Type definitions for @claude-flow/browser examples
 * 
 * These types help with TypeScript autocompletion and documentation.
 * The actual types come from the @claude-flow/browser package.
 */

// Browser Service Configuration
export interface BrowserServiceConfig {
  sessionId?: string;
  enableSecurity?: boolean;
  enableMemory?: boolean;
  allowedDomains?: string[];
  blockedDomains?: string[];
  timeout?: number;
}

// Snapshot Configuration
export interface SnapshotOptions {
  interactive?: boolean;  // Include only interactive elements
  fullPage?: boolean;     // Capture full page
  includeStyles?: boolean;
}

// Snapshot Result
export interface PageSnapshot {
  url: string;
  title: string;
  elements: Record<string, ElementRef>;
  accessibility?: AccessibilityTree;
  timestamp: number;
}

// Element Reference (the @e1, @e2 refs)
export interface ElementRef {
  ref: string;           // e.g., "@e1"
  tagName: string;       // e.g., "input"
  type?: string;         // e.g., "text", "submit"
  role?: string;         // ARIA role
  label?: string;        // Accessible name
  value?: string;        // Current value
  placeholder?: string;
  bounds?: DOMRect;
}

// Accessibility Tree (for AI consumption)
export interface AccessibilityTree {
  role: string;
  name?: string;
  children?: AccessibilityTree[];
}

// Wait Options
export interface WaitOptions {
  selector?: string;
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
}

// Navigation Options
export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  skipSecurityCheck?: boolean;
}

// Trajectory for Learning
export interface Trajectory {
  id: string;
  name: string;
  steps: TrajectoryStep[];
  startTime: number;
  endTime?: number;
  success?: boolean;
  notes?: string;
}

export interface TrajectoryStep {
  action: string;
  target?: string;
  value?: string;
  timestamp: number;
  snapshot?: PageSnapshot;
}

// Swarm Configuration
export interface BrowserSwarmConfig {
  maxSessions?: number;
  enableSecurity?: boolean;
  enableMemory?: boolean;
}

// Extraction Result
export interface ExtractionResult {
  ref: string;
  text?: string;
  value?: string;
  href?: string;
  src?: string;
  attributes?: Record<string, string>;
}

// Security Scan Result
export interface SecurityScanResult {
  url: string;
  safe: boolean;
  warnings: string[];
  blocked: boolean;
  reason?: string;
}

// Re-export for convenience
export type {
  BrowserServiceConfig as Config,
  PageSnapshot as Snapshot,
  ElementRef as Element,
};
