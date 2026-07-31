import { ARCHIVED_BULLETINS } from './src/generated/bulletin-archive.ts';
import { NEWEST_BUNDLED_BULLETIN } from './src/generated/bundled-bulletins.ts';
import { bulletinTimeline } from './src/domain/timeline/bulletin-timeline.ts';
import { periodSummaryFrom } from './src/composition/period-view.ts';
import { detectGaps } from './src/domain/timeline/gap-detection.ts';

const t = bulletinTimeline([...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN]);
const s = periodSummaryFrom(t);
console.log('coverage:', JSON.stringify(s.coverage, null, 1));
console.log('gaps:', JSON.stringify(detectGaps(t)));
for (const row of s.cumulative) {
  console.log(`FLOW ${row.key}: total=${row.cumulative} peak=${row.peak}@${row.peakDate} | ${row.cumulativeWorkings}`);
}
for (const row of s.peaks) {
  console.log(`STOCK ${row.key}: peak=${row.peak}@${row.peakDate} latest=${row.latest}@${row.latestDate}`);
}
console.log('\nflood-deaths caveat:', s.cumulative.find(r=>r.key==='flood-deaths')?.caveat);
