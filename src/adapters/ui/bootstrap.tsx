/**
 * A props-driven shell for the console.
 *
 * The real composition root now lives in `src/composition/` — `createContainer`
 * builds the object graph and `App` holds the loaded bulletins and the user's
 * assumptions. This component is what remains once that work moved out: the
 * driving adapter's own minimal host, which owns loader state and nothing else
 * and takes ingestion as an injected function.
 *
 * It is kept because it is the smallest thing that renders the console with a
 * live loader — useful for exercising the UI against a stubbed parse — and it
 * is deliberately incapable of inventing data: with no `parseBulletin` it shows
 * an honest error rather than a fabricated bulletin.
 */

import { useState } from 'react';
import { ConsoleApp, type ConsoleData } from './console-app';
import type { BulletinLoaderState } from './view-models';

export type BootstrapProps = {
  /**
   * Turns a picked file into everything the console draws. Supplied by a host
   * that owns the ports; `src/composition/app.tsx` is the production one.
   */
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
          'This shell was mounted without a bulletin source, so there is nothing to read the ' +
          'PDF with. The console will not display figures it has not read.',
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
