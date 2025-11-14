/**
 * Main Entry Point
 * eLearning Automation Tool
 */

export * from './parsers';
export * from './nlp';
export * from './interactive/ActivityFactory';
export * from './scorm/SCORMPackageBuilder';
export * from './workflows/WorkflowOrchestrator';

// Export types
export * from './types/ParsedContent';
export * from './types/EnrichedContent';
export * from './types/InteractiveContent';
export * from './types/VideoContent';
export * from './types/SCORMPackage';

import { WorkflowOrchestrator } from './workflows/WorkflowOrchestrator';

export default WorkflowOrchestrator;
