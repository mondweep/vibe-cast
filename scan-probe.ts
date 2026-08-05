import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(process.argv[2]!)) }).promise;
const pat = new RegExp(process.argv[3]!, 'i');
for (let p = 1; p <= doc.numPages; p++) {
  const c = await (await doc.getPage(p)).getTextContent();
  const t = (c.items as any[]).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
  let m; const re = new RegExp(pat.source, 'gi');
  while ((m = re.exec(t)) !== null) {
    console.log(`p${p}: …${t.slice(Math.max(0, m.index - 60), m.index + 260)}…`);
    break;
  }
}
