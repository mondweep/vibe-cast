import { InMemoryNightRepository } from '../src/in-memory-repositories';
import { nightRepositoryContract } from './repository-contract';

nightRepositoryContract('in-memory', () => new InMemoryNightRepository());

// The Firestore adapter is held to this identical suite by
// firestore-repository.test.ts, which runs when an emulator is available.
