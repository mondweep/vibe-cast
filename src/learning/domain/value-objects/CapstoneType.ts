/**
 * CapstoneType Value Object
 *
 * The lesson completion requirement / capstone kind, per the "Capstone"
 * column in PRD §4.4.
 */

export enum CapstoneType {
  QUIZ = 'quiz',
  RUN_EXAMPLE = 'run_example',
  DESIGN_PATTERN = 'design_pattern',
  CODE_EXERCISE = 'code_exercise',
  DESIGN_DOCUMENT = 'design_document',
  TEST_SUITE = 'test_suite',
  DEPLOYMENT = 'deployment',
  REVIEW_CHECKLIST = 'review_checklist',
  ARCHITECTURE_DOC = 'architecture_doc',
  RUNNING_SYSTEM = 'running_system',
  COMMUNITY_PRESENTATION = 'community_presentation',
  PRODUCTION_DEPLOYMENT = 'production_deployment',
  MENTORSHIP = 'mentorship',
}

export function isValidCapstoneType(value: string): value is CapstoneType {
  return Object.values(CapstoneType).includes(value as CapstoneType);
}
