/**
 * The only file in the adapter that knows pdf.js exists.
 *
 * Deliberately thin, and deliberately untested: it contains no decisions.
 * Everything that could be wrong — clustering, columns, sentinels,
 * reconciliation — lives behind `PdfDocumentLoader` in files that are tested
 * with synthetic geometry. If this file breaks, it breaks loudly at load time
 * rather than quietly at parse time.
 */

import type { PageTextContent, PdfDocumentLoader } from './pdf-bulletin-source';
import type { TextRun } from './text-run';

type PdfJsTextItem = {
  readonly str?: string;
  readonly width?: number;
  readonly height?: number;
  readonly transform?: readonly number[];
};

type PdfJsPage = {
  getTextContent(): Promise<{ items: readonly unknown[] }>;
};

type PdfJsDocument = {
  readonly numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  destroy?: () => Promise<void>;
};

/** The slice of the pdf.js module surface we depend on. */
export type PdfJsModule = {
  getDocument(parameters: { data: Uint8Array }): { promise: Promise<PdfJsDocument> };
  GlobalWorkerOptions?: { workerSrc: string };
};

const toTextRun = (item: unknown, page: number): TextRun | undefined => {
  const candidate = item as PdfJsTextItem;
  const transform = candidate.transform;
  if (typeof candidate.str !== 'string' || transform === undefined) return undefined;
  return {
    str: candidate.str,
    // transform is [a, b, c, d, e, f]; e and f are the absolute x and y of the
    // text baseline in PDF user space.
    x: transform[4] ?? 0,
    y: transform[5] ?? 0,
    width: candidate.width ?? 0,
    height: candidate.height ?? 0,
    page,
  };
};

export const createPdfJsLoader = (pdfjs: PdfJsModule): PdfDocumentLoader => ({
  async load(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const document = await pdfjs.getDocument({ data }).promise;

    const pages: PageTextContent[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const runs = content.items
        .map((item) => toTextRun(item, pageNumber))
        .filter((run): run is TextRun => run !== undefined);
      pages.push({ page: pageNumber, runs });
    }

    await document.destroy?.();
    return pages;
  },
});
