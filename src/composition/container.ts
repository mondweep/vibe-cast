/**
 * The composition root's object graph.
 *
 * ADR-0001: this is the only place where a port is joined to an adapter.
 * Everything the container needs from the outside — pdf.js, IndexedDB, the
 * clock — arrives as an injected dependency with a browser default, so the
 * container itself can be built and asserted against in a plain test process
 * with no DOM and no PDF library loaded.
 *
 * **pdf.js is loaded lazily, on the first parse.** NFR-3/NFR-4: first paint
 * must not wait on a megabyte of PDF machinery the officer may never use. The
 * dynamic `import()` is what puts pdf.js in its own build chunk, and the module
 * is memoised so a second bulletin does not pay for it again.
 *
 * Nothing here reaches the network (NFR-5). The PDF is read from the `Blob` the
 * user picked, the worker is served from our own origin, and the repository is
 * the browser's own storage.
 */

import type { BulletinSource, Clock, ReportRepository } from '../application/ports';
import {
  ExportReport,
  ListBulletins,
  LoadBulletin,
  RemoveBulletin,
} from '../application/use-cases';
import { createPdfBulletinSource } from '../adapters/pdf/pdf-bulletin-source';
import { createPdfJsLoader, type PdfJsModule } from '../adapters/pdf/pdfjs-loader';
import {
  SystemClock,
  createReportRepository,
  isIndexedDbAvailable,
  openBulletinDatabase,
} from '../adapters/persistence';
import type { OpenBulletinDatabase } from '../adapters/persistence/indexeddb-report-repository';

/**
 * pdf.js as the composition root configures it.
 *
 * `workerPort` is not part of the slice the adapter declares — the adapter does
 * not care where the work happens — so it is typed here, where the decision is
 * actually made.
 */
export type ConfigurablePdfJsModule = PdfJsModule & {
  GlobalWorkerOptions?: { workerSrc: string; workerPort?: unknown };
};

export type ContainerDependencies = {
  /** Resolves the pdf.js module. Called at most once, on the first parse. */
  readonly loadPdfJs: () => Promise<ConfigurablePdfJsModule>;
  readonly isIndexedDbAvailable: () => boolean;
  readonly openDatabase: OpenBulletinDatabase;
  readonly clock: Clock;
};

/**
 * The browser default.
 *
 * The worker is bundled by Vite and instantiated from our own origin, which is
 * what `worker-src 'self' blob:` in the CSP allows. If the worker cannot be
 * constructed we fall through to pdf.js's main-thread path rather than failing
 * the parse: a slow bulletin beats an unreadable one.
 */
const importPdfJs = async (): Promise<ConfigurablePdfJsModule> => {
  const pdfjs = (await import('pdfjs-dist')) as unknown as ConfigurablePdfJsModule;
  try {
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.mjs?worker');
    const PdfWorker = workerModule.default;
    if (pdfjs.GlobalWorkerOptions !== undefined) {
      pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
    }
  } catch {
    // No worker: pdf.js runs on the main thread. Correct, just slower.
  }
  return pdfjs;
};

export const DEFAULT_CONTAINER_DEPENDENCIES: ContainerDependencies = {
  loadPdfJs: importPdfJs,
  isIndexedDbAvailable: () => isIndexedDbAvailable(),
  openDatabase: openBulletinDatabase,
  clock: new SystemClock(),
};

/**
 * A `BulletinSource` that does not exist until it is needed.
 *
 * The port is satisfied immediately; the library behind it is fetched on the
 * first `parse`. Memoised on the promise rather than the module so two bulletins
 * dropped at once cannot start two imports.
 */
export const createLazyBulletinSource = (
  loadPdfJs: () => Promise<ConfigurablePdfJsModule>,
): BulletinSource => {
  let pending: Promise<BulletinSource> | undefined;

  const resolve = (): Promise<BulletinSource> => {
    pending ??= loadPdfJs().then((pdfjs) =>
      createPdfBulletinSource({ loader: createPdfJsLoader(pdfjs) }),
    );
    return pending;
  };

  return {
    async parse(file) {
      const source = await resolve();
      return source.parse(file);
    },
  };
};

export type StorageStatus = {
  /** False when bulletins will not survive a page reload. */
  readonly durable: boolean;
  /** Present only when `durable` is false; safe to show a user verbatim. */
  readonly reason?: string;
};

export type Container = {
  readonly bulletins: BulletinSource;
  readonly reports: ReportRepository;
  readonly clock: Clock;
  readonly storage: StorageStatus;
  readonly loadBulletin: LoadBulletin;
  readonly listBulletins: ListBulletins;
  readonly removeBulletin: RemoveBulletin;
  readonly exportReport: ExportReport;
};

export const createContainer = async (
  overrides: Partial<ContainerDependencies> = {},
): Promise<Container> => {
  const deps: ContainerDependencies = { ...DEFAULT_CONTAINER_DEPENDENCIES, ...overrides };

  const choice = await createReportRepository({
    isAvailable: deps.isIndexedDbAvailable,
    open: deps.openDatabase,
  });

  const bulletins = createLazyBulletinSource(deps.loadPdfJs);
  const reports = choice.repository;

  return {
    bulletins,
    reports,
    clock: deps.clock,
    storage: { durable: choice.durable, reason: choice.reason },
    loadBulletin: new LoadBulletin(bulletins, reports),
    listBulletins: new ListBulletins(reports),
    removeBulletin: new RemoveBulletin(reports),
    exportReport: new ExportReport(),
  };
};
