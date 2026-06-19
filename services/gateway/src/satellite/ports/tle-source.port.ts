import { Satellite } from '../domain/satellite';

/**
 * Driven port: a source of fresh TLE sets. The production adapter fetches and
 * caches CelesTrak GP groups (ADR-0005); tests provide canned satellites.
 */
export interface TleSource {
  /** e.g. "stations", "visual", "starlink", "noaa". */
  fetchGroup(group: string): Promise<Satellite[]>;
}
