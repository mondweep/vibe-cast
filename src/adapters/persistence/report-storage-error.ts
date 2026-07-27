/**
 * Storage failures must be loud.
 *
 * A control room laptop in private-browsing mode, or one whose origin quota is
 * exhausted, will refuse to persist. The one outcome we will not accept is a
 * silent no-op that leaves an officer believing yesterday's bulletin is stored
 * when it is not, so every failure the adapter cannot handle is rethrown as this
 * type with a message an operator can act on.
 */
export class ReportStorageError extends Error {
  readonly operation: string;

  constructor(operation: string, detail: string, cause?: unknown) {
    super(`Could not ${operation}: ${detail}`);
    this.name = 'ReportStorageError';
    this.operation = operation;
    this.cause = cause;
  }
}

const nameOf = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'name' in error
    ? String((error as { name: unknown }).name)
    : '';

/** Turn a raw IndexedDB rejection into something worth showing a human. */
export const asStorageError = (operation: string, cause: unknown): ReportStorageError => {
  const name = nameOf(cause);
  if (name === 'QuotaExceededError') {
    return new ReportStorageError(
      operation,
      'browser storage is full. Remove older bulletins to free space — the bulletin you just ' +
        'loaded is still on screen and has not been lost.',
      cause,
    );
  }
  if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'UnknownError') {
    return new ReportStorageError(
      operation,
      'browser storage is unavailable. Private browsing windows block IndexedDB, so bulletins ' +
        'will work for this session but will not survive a reload.',
      cause,
    );
  }
  return new ReportStorageError(
    operation,
    cause instanceof Error ? cause.message : String(cause),
    cause,
  );
};
