import { Result, ok, err } from '@/shared/utils/Result';
import { RepositoryError } from '@/shared/errors/DomainError';
import { UserPreferences, PollingInterval, InterestThreshold, VoicePreset } from './UserPreferences';

/**
 * PreferencesRepository interface
 */
export interface IPreferencesRepository {
  save(preferences: UserPreferences): Promise<Result<UserPreferences>>;
  getPreferences(): Promise<Result<UserPreferences>>;
}

/**
 * IndexedDB-based PreferencesRepository
 */
export class PreferencesRepository implements IPreferencesRepository {
  private readonly dbName = 'driftwise-preferences';
  private readonly storeName = 'preferences';
  private db: IDBDatabase | null = null;
  private cache: UserPreferences | null = null;

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

  async save(preferences: UserPreferences): Promise<Result<UserPreferences>> {
    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      const data = this.serialize(preferences);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(data);

        request.onsuccess = () => {
          this.cache = preferences;
          resolve(ok(preferences));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to save preferences')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Save operation failed', { error }));
    }
  }

  async getPreferences(): Promise<Result<UserPreferences>> {
    if (this.cache) {
      return ok(this.cache);
    }

    try {
      if (!this.db) {
        return err(new RepositoryError('Database not initialized'));
      }

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get('default');

        request.onsuccess = () => {
          const record = request.result as Record<string, unknown> | undefined;
          if (!record) {
            // Return default if not found
            const defaults = UserPreferences.createDefault();
            this.cache = defaults;
            resolve(ok(defaults));
            return;
          }

          const preferences = this.deserialize(record);
          this.cache = preferences;
          resolve(ok(preferences));
        };

        request.onerror = () => {
          resolve(err(new RepositoryError('Failed to retrieve preferences')));
        };
      });
    } catch (error) {
      return err(new RepositoryError('Get operation failed', { error }));
    }
  }

  private serialize(preferences: UserPreferences): Record<string, unknown> {
    return {
      id: 'default',
      pollingInterval: preferences.pollingInterval.minutes,
      interestThreshold: preferences.interestThreshold,
      voicePresetName: preferences.voicePreset.name,
      voiceSpeed: preferences.voicePreset.speed,
      voicePitch: preferences.voicePreset.pitch,
      createdAt: preferences.createdAt.toISOString(),
      updatedAt: preferences.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, unknown>): UserPreferences {
    const interval = PollingInterval.create(data.pollingInterval as number);
    const threshold = data.interestThreshold as InterestThreshold;
    const preset = new VoicePreset(
      data.voicePresetName as string,
      data.voiceSpeed as number,
      data.voicePitch as number
    );

    return new UserPreferences(
      interval,
      threshold,
      preset,
      new Date(data.createdAt as string),
      new Date(data.updatedAt as string)
    );
  }
}
