import { Result, ok, err } from '@/shared/utils/Result';
import { RepositoryError } from '@/shared/errors/DomainError';
import { FactDelivery } from './Fact';

/**
 * FactRepository interface
 */
export interface IFactRepository {
  save(delivery: FactDelivery): Promise<Result<FactDelivery>>;
  findRecentByLocation(location: string, hoursBack: number): Promise<Result<FactDelivery[]>>;
  getDeliveryCount(location: string): Promise<Result<number>>;
  isDuplicate(delivery: FactDelivery): Promise<Result<boolean>>;
}

/**
 * IndexedDB-based FactRepository with in-memory cache
 */
export class FactRepository implements IFactRepository {
  private readonly dbName = 'driftwise-discovery';
  private readonly storeName = 'fact-deliveries';
  private db: IDBDatabase | null = null;
  private cache: Map<string, FactDelivery> = new Map();
  private deduplicationHashes: Set<string> = new Set();
  private readonly cacheTTL = 30 * 60 * 1000; // 30 minutes

  async initialize(): Promise<Result<void>> {
    try {
      return new Promise((resolve) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to open IndexedDB')));
        };

        request.onsuccess = () => {
          this.db = request.result;
          // Load deduplication hashes on init
          this.loadDeduplicationHashes();
          resolve(ok(undefined));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('location', 'location');
            store.createIndex('deliveredAt', 'deliveredAt');
            store.createIndex('hash', 'hash');
          }
        };
      });
    } catch (error) {
      return err(new RepositoryError('Failed to initialize repository', { error }));
    }
  }

  async save(delivery: FactDelivery): Promise<Result<FactDelivery>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      const data = this.serialize(delivery);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(data);

        request.onsuccess = () => {
          this.cache.set(delivery.id, delivery);
          this.deduplicationHashes.add(delivery.getHash());
          resolve(ok(delivery));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to save fact delivery')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Save operation failed', { error }));
    }
  }

  async findRecentByLocation(
    location: string,
    hoursBack: number = 24
  ): Promise<Result<FactDelivery[]>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('location');
        const request = index.getAll(location);

        request.onsuccess = () => {
          const records = request.result as Array<Record<string, unknown>>;
          const filtered = records
            .filter((r) => new Date(r.deliveredAt as string) > cutoffTime)
            .map((r) => this.deserialize(r));
          resolve(ok(filtered));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to find facts by location')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Find operation failed', { error }));
    }
  }

  async getDeliveryCount(location: string): Promise<Result<number>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const index = store.index('location');
        const request = index.count(location);

        request.onsuccess = () => {
          resolve(ok(request.result));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to count deliveries')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Count operation failed', { error }));
    }
  }

  async isDuplicate(delivery: FactDelivery): Promise<Result<boolean>> {
    try {
      const hash = delivery.getHash();
      return ok(this.deduplicationHashes.has(hash));
    } catch (error) {
      return err(new RepositoryError('Duplicate check failed', { error }));
    }
  }

  private async loadDeduplicationHashes(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result as Array<Record<string, unknown>>;
        records.forEach((r) => {
          this.deduplicationHashes.add(r.hash as string);
        });
      };
    } catch (error) {
      console.error('Failed to load deduplication hashes:', error);
    }
  }

  private serialize(delivery: FactDelivery): Record<string, unknown> {
    return {
      id: delivery.id,
      factText: delivery.fact.text,
      sourceLocation: delivery.fact.sourceLocation,
      confidence: delivery.assessment.confidence,
      isGeneric: delivery.assessment.isGeneric,
      hasSpecificity: delivery.assessment.hasSpecificity,
      reasoning: delivery.assessment.reasoning,
      location: delivery.location,
      deliveredAt: delivery.deliveredAt.toISOString(),
      userFeedback: delivery.userFeedback,
      hash: delivery.getHash(),
    };
  }

  private deserialize(data: Record<string, unknown>): FactDelivery {
    const { Fact } = require('./Fact');
    const { QualityAssessment } = require('./Fact');

    const fact = new Fact(
      data.factText as string,
      data.sourceLocation as string
    );

    const assessment = new QualityAssessment(
      data.confidence as number,
      data.isGeneric as boolean,
      data.hasSpecificity as boolean,
      data.reasoning as string
    );

    return new FactDelivery(
      data.id as string,
      fact,
      assessment,
      data.location as string,
      new Date(data.deliveredAt as string),
      data.userFeedback as 'liked' | 'disliked' | 'neutral' | undefined
    );
  }
}
