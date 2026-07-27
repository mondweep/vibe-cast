import { createFakeBulletinDatabase } from './fake-bulletin-database';
import { InMemoryReportRepository } from './in-memory-report-repository';
import { IndexedDbReportRepository } from './indexeddb-report-repository';
import { describeReportRepositoryContract } from './report-repository.contract';

// Both implementations are held to the identical behavioural contract. That is
// the evidence that the composition root may swap one for the other when
// IndexedDB is blocked, without any caller noticing.
describeReportRepositoryContract('InMemoryReportRepository', () => new InMemoryReportRepository());

describeReportRepositoryContract('IndexedDbReportRepository', () => {
  const db = createFakeBulletinDatabase();
  return new IndexedDbReportRepository(async () => db);
});
