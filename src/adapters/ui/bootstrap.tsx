/**
 * Temporary composition root for the UI adapter.
 *
 * The real one belongs in the application layer: it will construct a
 * `BulletinSource` (the pdf.js adapter), a `ReportRepository` (IndexedDB), run
 * the ingestion use case, and map the resulting `FloodSituationReport` into the
 * view models in `./view-models`.
 *
 * Until that wiring lands, this renders the console honestly: the loader is
 * live, and dropping a PDF produces a clear "not wired yet" error rather than
 * a fake report. The console never invents data.
 */

import { useState } from 'react';
import { ConsoleApp, type ConsoleData } from './console-app';
import type { BulletinLoaderState } from './view-models';

export type BootstrapProps = {
  /** Supplied by the real composition root once ingestion is wired. */
  readonly parseBulletin?: (file: File) => Promise<ConsoleData>;
};

export const Bootstrap = ({ parseBulletin }: BootstrapProps) => {
  const [loaderState, setLoaderState] = useState<BulletinLoaderState>({ status: 'idle' });
  const [data, setData] = useState<ConsoleData | null>(null);

  const onLoadBulletin = (file: File) => {
    if (!parseBulletin) {
      setLoaderState({
        status: 'error',
        fileName: file.name,
        message:
          'Bulletin ingestion is not wired into this build yet. The console will not display figures it has not read.',
      });
      return;
    }

    setLoaderState({ status: 'parsing', fileName: file.name });
    parseBulletin(file).then(
      (parsed) => {
        setData(parsed);
        setLoaderState({
          status: 'loaded',
          fileName: file.name,
          reportDate: parsed.summary.reportDate,
          sections: parsed.summary.unreadableSections,
          reconciliationWarnings: parsed.summary.reconciliationWarnings,
        });
      },
      (error: unknown) => {
        setLoaderState({
          status: 'error',
          fileName: file.name,
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
  };

  return (
    <ConsoleApp loaderState={loaderState} onLoadBulletin={onLoadBulletin} data={data} />
  );
};
