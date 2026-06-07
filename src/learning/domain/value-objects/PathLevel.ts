/**
 * PathLevel Value Object
 *
 * The three learning-path levels (PRD §4.4). Ordered so prerequisite
 * gating can ask "is level X at or above level Y".
 */

export enum PathLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

const LEVEL_ORDER: PathLevel[] = [
  PathLevel.BEGINNER,
  PathLevel.INTERMEDIATE,
  PathLevel.ADVANCED,
];

export function isValidPathLevel(value: string): value is PathLevel {
  return LEVEL_ORDER.includes(value as PathLevel);
}

export function pathLevelRank(level: PathLevel): number {
  return LEVEL_ORDER.indexOf(level);
}
