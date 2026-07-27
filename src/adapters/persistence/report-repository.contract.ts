/**
 * The behavioural contract of `ReportRepository`.
 *
 * Every implementation runs this same suite. That is what makes the in-memory
 * repository a legitimate substitute for the IndexedDB one in the composition
 * root's private-browsing fallback path (NFR-6): substitutability is asserted,
 * not assumed.
 *
 * Deliberately NOT named `*.test.ts` — it is a suite factory, invoked from
 * `report-repository.contract.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { aReport, bulletinId, reportDate } from '../../application/services/report.fixture';
import type { ReportRepository } from '../../application/ports';

export const describeReportRepositoryContract = (
  name: string,
  createRepository: () => ReportRepository,
): void => {
  describe(`${name} — ReportRepository contract`, () => {
    it('starts empty', async () => {
      expect(await createRepository().findAll()).toEqual([]);
    });

    it('finds a saved report by its id', async () => {
      const repository = createRepository();
      const report = aReport({ bulletinId: bulletinId('a1') });

      await repository.save(report);

      expect(await repository.findById(bulletinId('a1'))).toEqual(report);
    });

    it('returns undefined for an id it has never seen', async () => {
      expect(await createRepository().findById(bulletinId('never-loaded'))).toBeUndefined();
    });

    it('finds a saved report by its report date', async () => {
      const repository = createRepository();
      const report = aReport({ bulletinId: bulletinId('a1'), reportDate: reportDate('2026-07-27') });

      await repository.save(report);

      expect(await repository.findByDate(reportDate('2026-07-27'))).toEqual(report);
    });

    it('returns undefined for a date it holds no bulletin for', async () => {
      const repository = createRepository();
      await repository.save(aReport({ reportDate: reportDate('2026-07-27') }));

      expect(await repository.findByDate(reportDate('2026-07-26'))).toBeUndefined();
    });

    it('does not duplicate when the same bulletin id is saved twice (PRD §5.6)', async () => {
      const repository = createRepository();
      const report = aReport({ bulletinId: bulletinId('same-file') });

      await repository.save(report);
      await repository.save(report);

      expect(await repository.findAll()).toHaveLength(1);
    });

    it('lets a re-save of the same id replace the stored content', async () => {
      const repository = createRepository();
      await repository.save(aReport({ bulletinId: bulletinId('a1'), generatedAt: 'first' }));
      await repository.save(aReport({ bulletinId: bulletinId('a1'), generatedAt: 'second' }));

      const stored = await repository.findById(bulletinId('a1'));

      expect(stored?.generatedAt).toBe('second');
      expect(await repository.findAll()).toHaveLength(1);
    });

    it('holds bulletins with different ids separately', async () => {
      const repository = createRepository();
      await repository.save(aReport({ bulletinId: bulletinId('a1'), reportDate: reportDate('2026-07-26') }));
      await repository.save(aReport({ bulletinId: bulletinId('b2'), reportDate: reportDate('2026-07-27') }));

      expect(await repository.findAll()).toHaveLength(2);
    });

    it('returns findAll in primary-key order, identically across implementations', async () => {
      const repository = createRepository();
      await repository.save(aReport({ bulletinId: bulletinId('c3'), reportDate: reportDate('2026-07-25') }));
      await repository.save(aReport({ bulletinId: bulletinId('a1'), reportDate: reportDate('2026-07-27') }));
      await repository.save(aReport({ bulletinId: bulletinId('b2'), reportDate: reportDate('2026-07-26') }));

      expect((await repository.findAll()).map((r) => r.bulletinId)).toEqual(['a1', 'b2', 'c3']);
    });

    it('breaks a same-date tie deterministically on the greatest bulletin id', async () => {
      // A revised bulletin for the same day is a real occurrence. Both are kept;
      // the by-date lookup resolves to one of them predictably rather than by
      // whichever happened to be dragged in first.
      const repository = createRepository();
      await repository.save(aReport({ bulletinId: bulletinId('a1'), reportDate: reportDate('2026-07-27') }));
      await repository.save(aReport({ bulletinId: bulletinId('z9'), reportDate: reportDate('2026-07-27') }));

      expect((await repository.findByDate(reportDate('2026-07-27')))?.bulletinId).toBe('z9');
      expect(await repository.findAll()).toHaveLength(2);
    });

    it('deletes a bulletin', async () => {
      const repository = createRepository();
      await repository.save(aReport({ bulletinId: bulletinId('a1'), reportDate: reportDate('2026-07-27') }));

      await repository.delete(bulletinId('a1'));

      expect(await repository.findById(bulletinId('a1'))).toBeUndefined();
      expect(await repository.findByDate(reportDate('2026-07-27'))).toBeUndefined();
      expect(await repository.findAll()).toEqual([]);
    });

    it('treats deleting an unknown bulletin as a no-op rather than an error', async () => {
      const repository = createRepository();
      await repository.save(aReport({ bulletinId: bulletinId('a1') }));

      await expect(repository.delete(bulletinId('not-here'))).resolves.toBeUndefined();
      expect(await repository.findAll()).toHaveLength(1);
    });

    it('hands out snapshots, so a caller mutating a result cannot corrupt the store', async () => {
      const repository = createRepository();
      const report = aReport({ bulletinId: bulletinId('a1') });
      await repository.save(report);

      const first = await repository.findById(bulletinId('a1'));
      expect(first).not.toBe(report);
      (first as { generatedAt: string }).generatedAt = 'tampered';

      expect((await repository.findById(bulletinId('a1')))?.generatedAt).toBe(report.generatedAt);
    });

    it('preserves the unknown-vs-zero distinction across a save/load round trip', async () => {
      const repository = createRepository();
      const report = aReport({
        bulletinId: bulletinId('a1'),
        statewideTotals: {
          ...aReport().statewideTotals,
          campInmates: { kind: 'unknown', unit: 'count' },
          nonCampInmates: { kind: 'known', unit: 'count', value: 0 },
        },
      });

      await repository.save(report);
      const stored = await repository.findById(bulletinId('a1'));

      expect(stored?.statewideTotals.campInmates).toEqual({ kind: 'unknown', unit: 'count' });
      expect(stored?.statewideTotals.nonCampInmates).toEqual({
        kind: 'known',
        unit: 'count',
        value: 0,
      });
    });
  });
};
