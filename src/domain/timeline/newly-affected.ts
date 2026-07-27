/**
 * Temporal Comparison — districts newly affected or newly clear (FR-5.3).
 *
 * The two transitions a control room acts on. A district crossing from zero to
 * non-zero is where the next NDRF column goes; a district crossing back to zero
 * is where assets can be released.
 *
 * Three distinctions are load-bearing, and all three are ones the PDF blurs:
 *
 *  - **Zero is not unknown.** A district reporting 0 affected is *reported and
 *    quiet* (PRD §4.1) and can be called newly affected tomorrow. A district
 *    whose figure was not reported cannot be called anything.
 *  - **Absent is not clear.** A district that drops out of the bulletin has not
 *    been declared safe; it has stopped being reported on.
 *  - **A gap is not a comparison.** Transitions are only computed between
 *    consecutive days.
 */

import { normaliseName } from '../shared/administrative-unit';
import type { DistrictName } from '../shared/administrative-unit';
import { valueOf } from '../shared/quantity';
import type { FloodSituationReport, ReportDate } from '../shared/flood-situation-report';
import type { BulletinTimeline } from './bulletin-timeline';

export type TransitionKind = 'newly-affected' | 'newly-clear';

export type DistrictTransition = {
  /** Spelled as the *current* bulletin spells it, so it can be found in the PDF. */
  readonly district: DistrictName;
  readonly transition: TransitionKind;
  readonly previously: number | undefined;
  readonly now: number | undefined;
};

export type UnassessableDistrict = {
  readonly district: DistrictName;
  readonly reason: string;
};

export type TransitionReport = {
  readonly from: ReportDate;
  readonly to: ReportDate;
  readonly newlyAffected: readonly DistrictTransition[];
  readonly newlyClear: readonly DistrictTransition[];
  readonly notAssessable: readonly UnassessableDistrict[];
};

const affectedByDistrict = (
  report: FloodSituationReport,
): ReadonlyMap<string, { name: DistrictName; affected: number | undefined }> =>
  new Map(
    report.districts.map((d) => [
      normaliseName(d.district),
      { name: d.district, affected: valueOf(d.population.total) },
    ]),
  );

export const districtTransitions = (
  previousReport: FloodSituationReport,
  currentReport: FloodSituationReport,
): TransitionReport => {
  const before = affectedByDistrict(previousReport);
  const now = affectedByDistrict(currentReport);

  const newlyAffected: DistrictTransition[] = [];
  const newlyClear: DistrictTransition[] = [];
  const notAssessable: UnassessableDistrict[] = [];

  for (const [key, current] of now) {
    const previous = before.get(key);

    if (current.affected === undefined) {
      notAssessable.push({
        district: current.name,
        reason:
          `Affected population was not reported for this district in the ` +
          `${currentReport.reportDate} bulletin.`,
      });
      continue;
    }
    if (previous !== undefined && previous.affected === undefined) {
      notAssessable.push({
        district: current.name,
        reason:
          `Affected population was not reported for this district in the ` +
          `${previousReport.reportDate} bulletin.`,
      });
      continue;
    }

    const previouslyAffected = previous?.affected;
    if (current.affected > 0 && (previouslyAffected === undefined || previouslyAffected === 0)) {
      newlyAffected.push({
        district: current.name,
        transition: 'newly-affected',
        previously: previouslyAffected,
        now: current.affected,
      });
    } else if (
      current.affected === 0 &&
      previouslyAffected !== undefined &&
      previouslyAffected > 0
    ) {
      newlyClear.push({
        district: current.name,
        transition: 'newly-clear',
        previously: previouslyAffected,
        now: 0,
      });
    }
  }

  // A district that has disappeared from the bulletin has not been declared
  // safe. Silence is not a clearance.
  for (const [key, previous] of before) {
    if (now.has(key)) continue;
    notAssessable.push({
      district: previous.name,
      reason: `This district does not appear in the ${currentReport.reportDate} bulletin at all.`,
    });
  }

  return {
    from: previousReport.reportDate,
    to: currentReport.reportDate,
    newlyAffected,
    newlyClear,
    notAssessable,
  };
};

/** One transition report per genuinely consecutive pair of bulletins. */
export const transitionsAcrossTimeline = (
  timeline: BulletinTimeline,
): readonly TransitionReport[] =>
  timeline.successivePairs
    .filter((pair) => pair.spanDays === 1)
    .map((pair) => districtTransitions(pair.previous, pair.current));
