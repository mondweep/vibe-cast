/** Persistence adapter — everything the composition root needs to wire storage. */

export { bulletinIdFromBlob, bulletinIdFromBytes, webCryptoDigestProvider } from './bulletin-id';
export type { DigestProvider } from './bulletin-id';
export { createReportRepository } from './create-report-repository';
export type { ReportRepositoryChoice } from './create-report-repository';
export { InMemoryReportRepository } from './in-memory-report-repository';
export {
  BULLETIN_STORE,
  DATABASE_NAME,
  DATABASE_VERSION,
  IndexedDbReportRepository,
  REPORT_DATE_INDEX,
} from './indexeddb-report-repository';
export type { BulletinDatabase, OpenBulletinDatabase } from './indexeddb-report-repository';
export { isIndexedDbAvailable, openBulletinDatabase } from './open-bulletin-database';
export { ReportStorageError, asStorageError } from './report-storage-error';
export { FixedClock, SystemClock } from './system-clock';
