import { Result, ok, err } from '@/shared/utils/Result';
import { RepositoryError } from '@/shared/errors/DomainError';
import { Location } from './Location';

/**
 * LocationRepository interface
 */
export interface ILocationRepository {
  save(location: Location): Promise<Result<Location>>;
  getLastLocation(): Promise<Result<Location | null>>;
  clear(): Promise<Result<void>>;
}

/**
 * IndexedDB-based LocationRepository implementation
 */
export class LocationRepository implements ILocationRepository {
  private readonly dbName = 'driftwise-location';
  private readonly storeName = 'locations';
  private db: IDBDatabase | null = null;
  private cache: Map<string, { data: Location; timestamp: number }> = new Map();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  async initialize(): Promise<Result<void>> {
    try {
      return new Promise((resolve) => {
        const request = indexedDB.open(this.dbName, 1);

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to open IndexedDB')));
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve(ok(undefined));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
      });
    } catch (error) {
      return err(new RepositoryError('Failed to initialize repository', { error }));
    }
  }

  async save(location: Location): Promise<Result<Location>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      const data = this.serializeLocation(location);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(data);

        request.onsuccess = () => {
          this.cache.set(location.id.value, {
            data: location,
            timestamp: Date.now(),
          });
          resolve(ok(location));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to save location')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Save operation failed', { error }));
    }
  }

  async getLastLocation(): Promise<Result<Location | null>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const records = request.result as Array<unknown>;
          if (records.length === 0) {
            resolve(ok(null));
            return;
          }

          // Get most recent location
          const lastRecord = records[records.length - 1] as Record<string, unknown>;
          const location = this.deserializeLocation(lastRecord);
          resolve(ok(location));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to retrieve location')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Get operation failed', { error }));
    }
  }

  async clear(): Promise<Result<void>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          this.cache.clear();
          resolve(ok(undefined));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to clear locations')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Clear operation failed', { error }));
    }
  }

  private serializeLocation(location: Location): Record<string, unknown> {
    return {
      id: location.id.value,
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
      accuracy: location.coordinates.accuracy,
      city: location.placeNames.city,
      state: location.placeNames.state,
      country: location.placeNames.country,
      acquiredAt: location.acquiredAt.toISOString(),
      expiresAt: location.expiresAt?.toISOString(),
    };
  }

  private deserializeLocation(data: Record<string, unknown>): Location {
    const { Location: LocationClass } = require('./Location');
    const { GPSCoordinates } = require('./Location');
    const { PlaceNames } = require('./Location');

    const coordinates = new GPSCoordinates(
      data.latitude as number,
      data.longitude as number,
      data.accuracy as number
    );

    const placeNames = new PlaceNames(
      data.city as string | undefined,
      data.state as string | undefined,
      data.country as string | undefined
    );

    const acquiredAt = new Date(data.acquiredAt as string);
    const expiresAt = data.expiresAt ? new Date(data.expiresAt as string) : undefined;

    return new (LocationClass as typeof Location)(
      { value: data.id as string },
      coordinates,
      placeNames,
      acquiredAt,
      expiresAt
    );
  }
}
