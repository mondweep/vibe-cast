import { ARCHIVED_BULLETINS } from './src/generated/bulletin-archive.ts';
import { NEWEST_BUNDLED_BULLETIN } from './src/generated/bundled-bulletins.ts';
import { boundaryFor } from './src/adapters/ui/choropleth-scale.ts';

const all = [...ARCHIVED_BULLETINS, NEWEST_BUNDLED_BULLETIN];
for (const r of all) {
  const names = r.districts.map((d) => String(d.district));
  const unplaced = names.filter((n) => boundaryFor(n) === undefined);
  console.log(String(r.reportDate), '| total', names.length, '| unplaced', JSON.stringify(unplaced.map(n => n.length > 40 ? n.slice(0,37)+'...' : n)));
}
console.log('\nNEWEST districts:', JSON.stringify(NEWEST_BUNDLED_BULLETIN.districts.map(d=>String(d.district))));
