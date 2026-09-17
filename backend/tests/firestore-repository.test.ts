import { nightRepositoryContract } from './repository-contract';

/**
 * ADR-008: the real adapter is held to the same contract as the fake.
 *
 * This runs against the Firestore emulator when FIRESTORE_EMULATOR_HOST is
 * set — locally via `firebase emulators:start`, and in CI. It is skipped
 * rather than failed when no emulator is present, so a contributor without
 * the emulator installed is not blocked, but CI does run it.
 */
const emulator = process.env.FIRESTORE_EMULATOR_HOST;

if (emulator === undefined) {
  describe('NightRepositoryPort contract: firestore', () => {
    it.skip('requires FIRESTORE_EMULATOR_HOST to be set', () => {
      /* skipped without an emulator */
    });
  });
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FirestoreNightRepository } = require('../src/firestore-repositories');
  let counter = 0;
  nightRepositoryContract(
    'firestore emulator',
    () => new FirestoreNightRepository(`somnus-contract-${counter++}`),
  );
}
