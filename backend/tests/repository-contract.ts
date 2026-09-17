import type { NightRepositoryPort, NightAnalysis } from '@somnus/domain';

/**
 * The contract every NightRepository must satisfy, whatever it is built on.
 *
 * ADR-008 requires this: a mockist suite is only as good as the fidelity of
 * its doubles, and the standard way mockist test suites rot is that the fake
 * quietly stops behaving like the real thing. Running one suite against both
 * is the mitigation.
 */
export function nightRepositoryContract(
  name: string,
  makeRepo: () => NightRepositoryPort,
): void {
  describe(`NightRepositoryPort contract: ${name}`, () => {
    const night = (id: string, date: string): NightAnalysis =>
      ({
        nightId: id,
        date,
        status: 'analysed',
        monitoredMs: 28_800_000,
        interruptedMs: 0,
        snoreIndex: 12,
        snoreTimeFraction: 0.1,
        episodeCount: 96,
        episodes: [],
        bandDistribution: { quiet: 0, mild: 40, moderate: 50, loud: 6 },
        peakIntensityDb: 22,
        medianIntensityDb: 11,
        quietPeriods: [],
        analyserVersion: '1.0.0',
        wasInterrupted: false,
      }) as NightAnalysis;

    it('returns null for a night that was never saved', async () => {
      const repo = makeRepo();
      expect(await repo.get('u1', 'missing')).toBeNull();
    });

    it('round-trips a saved night', async () => {
      const repo = makeRepo();
      await repo.save('u1', night('n1', '2026-09-01'));
      expect((await repo.get('u1', 'n1'))?.nightId).toBe('n1');
    });

    // ADR-007: the property the whole sync design rests on.
    it('is idempotent: saving the same night twice leaves exactly one', async () => {
      const repo = makeRepo();
      await repo.save('u1', night('n1', '2026-09-01'));
      await repo.save('u1', night('n1', '2026-09-01'));
      expect(await repo.listRecent('u1', 50)).toHaveLength(1);
    });

    it('isolates users from one another', async () => {
      const repo = makeRepo();
      await repo.save('u1', night('n1', '2026-09-01'));
      expect(await repo.get('u2', 'n1')).toBeNull();
      expect(await repo.listRecent('u2', 50)).toHaveLength(0);
    });

    it('lists most recent first', async () => {
      const repo = makeRepo();
      await repo.save('u1', night('a', '2026-09-01'));
      await repo.save('u1', night('b', '2026-09-03'));
      await repo.save('u1', night('c', '2026-09-02'));
      expect((await repo.listRecent('u1', 50)).map((n) => n.date)).toEqual([
        '2026-09-03', '2026-09-02', '2026-09-01',
      ]);
    });

    it('honours the limit', async () => {
      const repo = makeRepo();
      await repo.save('u1', night('a', '2026-09-01'));
      await repo.save('u1', night('b', '2026-09-02'));
      expect(await repo.listRecent('u1', 1)).toHaveLength(1);
    });

    it('deletes everything for one user and nobody else (FR-D4)', async () => {
      const repo = makeRepo();
      await repo.save('u1', night('n1', '2026-09-01'));
      await repo.save('u2', night('n2', '2026-09-01'));
      await repo.deleteAll('u1');
      expect(await repo.listRecent('u1', 50)).toHaveLength(0);
      expect(await repo.listRecent('u2', 50)).toHaveLength(1);
    });
  });
}
