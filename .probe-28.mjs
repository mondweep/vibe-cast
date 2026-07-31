import { readFile } from 'node:fs/promises';
import { createPdfBulletinSource } from './src/adapters/pdf/pdf-bulletin-source.ts';
import { createPdfJsLoader } from './src/adapters/pdf/pdfjs-loader.ts';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const source = createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) });

for (const stamp of process.argv.slice(2)) {
  const bytes = await readFile(`./fixtures/Daily_Flood_Report_${stamp}.pdf`);
  const r = await source.parse(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const conf = {};
  for (const p of r.provenance) conf[p.confidence] = (conf[p.confidence] ?? 0) + 1;
  console.log(
    stamp,
    '| date', r.reportDate,
    '| gen', r.generatedAt,
    '| sections', r.provenance.length,
    '| confidence', JSON.stringify(conf),
    '| pop', JSON.stringify(r.statewideTotals.populationAffected),
    '| camps', JSON.stringify(r.statewideTotals.reliefCamps),
    '| inmates', JSON.stringify(r.statewideTotals.campInmates),
    '| nonCamp', JSON.stringify(r.statewideTotals.nonCampInmates),
    '| districts', r.districts.length,
    '| deaths', r.districts.map((d) => d.casualties.floodDeaths).filter((q) => q.kind === 'known').reduce((a, q) => a + q.value, 0),
    '| reconFail', r.reconciliationFailures.length,
  );
  console.log('   districtNames:', JSON.stringify(r.districts.map((d) => String(d.district)).slice(0, 20)));
}
