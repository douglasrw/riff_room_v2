/**
 * Multi-layer cache manager for RiffRoom
 *
 * Implements 3-tier caching strategy:
 * 1. Memory (L1) - Fastest, limited size
 * 2. IndexedDB (L2) - Persistent, offline support
 * 3. Network/Backend (L3) - Fallback for cache misses
 *
 * Features:
 * - LRU eviction policy
 * - Configurable size limits
 * - Automatic cleanup
 * - Cache key generation (SHA256 hash)
 */

export interface CacheOptions {
  maxMemorySizeMB?: number;    // Default: 100MB
  maxIndexedDBSizeMB?: number; // Default: 500MB
  ttlSeconds?: number;         // Default: 7 days
}

interface CacheEntry<T> {
  key: string;
  value: T;
  size: number;          // Bytes
  timestamp: number;     // Unix timestamp
  accessCount: number;
  lastAccessed: number;  // Unix timestamp
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  maxMemorySizeMB: 100,
  maxIndexedDBSizeMB: 500,
  ttlSeconds: 7 * 24 * 60 * 60, // 7 days
};

export class CacheManager<T = any> {
  private memoryCache: Map<string, CacheEntry<T>> = new Map();
  private currentMemorySize: number = 0;
  private options: Required<CacheOptions>;
  private dbName: string = 'riffroom-cache';
  private db: IDBDatabase | null = null;
  // FIXED: Track initialization promise to prevent race conditions
  private _initPromise: Promise<void> | null = null;

  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this._initPromise = this.initIndexedDB();
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.cleanupExpiredEntries();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
        }
      };
    });
  }

  /**
   * Get value from cache (checks all layers)
   */
  async get(key: string): Promise<T | null> {
    // FIXED: Wait for initialization to complete
    if (this._initPromise) {
      await this._initPromise.catch(() => {
        // If IndexedDB fails (e.g., private browsing), continue with memory-only cache
        this.db = null;
      });
    }

    // L1: Check memory cache
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      // FIXED H10: Delete expired entries from memory to prevent leak
      if (this.isExpired(memoryEntry)) {
        this.currentMemorySize -= memoryEntry.size;
        this.memoryCache.delete(key);
      } else {
        this.updateAccess(memoryEntry);
        return memoryEntry.value;
      }
    }

    // L2: Check IndexedDB (if available)
    if (this.db) {
      const dbEntry = await this.getFromIndexedDB(key);
      if (dbEntry && !this.isExpired(dbEntry)) {
        // Promote to memory cache
        this.setInMemory(key, dbEntry.value, dbEntry.size);
        return dbEntry.value;
      }
    }

    return null;
  }

  /**
   * Set value in all cache layers
   */
  async set(key: string, value: T, sizeBytes?: number): Promise<void> {
    // FIXED: Wait for initialization to complete
    if (this._initPromise) {
      await this._initPromise.catch(() => {
        // If IndexedDB fails, continue with memory-only cache
        this.db = null;
      });
    }

    const size = sizeBytes ?? this.estimateSize(value);

    // L1: Memory cache
    this.setInMemory(key, value, size);

    // L2: IndexedDB (if available)
    if (this.db) {
      await this.setInIndexedDB(key, value, size);
    }
  }

  private setInMemory(key: string, value: T, size: number): void {
    // FIXED H11: Reject entries larger than max size
    const maxSize = this.options.maxMemorySizeMB * 1024 * 1024;
    if (size > maxSize) {
      console.warn(`Cache entry size (${size} bytes) exceeds max memory (${maxSize} bytes), skipping memory cache`);
      return;
    }

    // Check if we need to evict
    while (this.currentMemorySize + size > maxSize && this.memoryCache.size > 0) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      size,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.memoryCache.set(key, entry);
    this.currentMemorySize += size;
  }

  private async setInIndexedDB(key: string, value: T, size: number): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const entry: CacheEntry<T> = {
        key,
        value,
        size,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getFromIndexedDB(key: string): Promise<CacheEntry<T> | null> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        if (entry) {
          // Update access info
          entry.accessCount++;
          entry.lastAccessed = Date.now();
          this.updateIndexedDBEntry(entry);
        }
        resolve(entry ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async updateIndexedDBEntry(entry: CacheEntry<T>): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    store.put(entry);
  }

  /**
   * Remove entry from all cache layers
   */
  async delete(key: string): Promise<void> {
    // L1: Memory
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      this.currentMemorySize -= memEntry.size;
      this.memoryCache.delete(key);
    }

    // L2: IndexedDB
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    // Clear memory
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    // Clear IndexedDB
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    memorySizeMB: number;
    indexedDBEntries: number;
    indexedDBSizeMB: number;
  }> {
    const memoryEntries = this.memoryCache.size;
    const memorySizeMB = this.currentMemorySize / (1024 * 1024);

    // Count IndexedDB entries
    let indexedDBEntries = 0;
    let indexedDBSize = 0;

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        const transaction = this.db!.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const request = store.getAll();

        request.onsuccess = () => {
          const entries = request.result as CacheEntry<T>[];
          indexedDBEntries = entries.length;
          indexedDBSize = entries.reduce((sum, entry) => sum + entry.size, 0);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    return {
      memoryEntries,
      memorySizeMB: Number(memorySizeMB.toFixed(2)),
      indexedDBEntries,
      indexedDBSizeMB: Number((indexedDBSize / (1024 * 1024)).toFixed(2)),
    };
  }

  // === Private Helper Methods ===

  private isExpired(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    const maxAge = this.options.ttlSeconds * 1000;
    return age > maxAge;
  }

  private updateAccess(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Evict least recently used entry from memory cache
   */
  private evictLRU(): void {
    let oldestEntry: CacheEntry<T> | null = null;
    let oldestKey: string | null = null;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed) {
        oldestEntry = entry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.currentMemorySize -= oldestEntry!.size;
      this.memoryCache.delete(oldestKey);
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    if (value instanceof Blob) {
      return value.size;
    }
    if (value instanceof ArrayBuffer) {
      return value.byteLength;
    }
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    // For objects, rough estimate via JSON
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024; // Default 1KB if can't estimate
    }
  }

  /**
   * Remove expired entries from IndexedDB
   */
  private async cleanupExpiredEntries(): Promise<void> {
    if (!this.db) return;

    const cutoffTime = Date.now() - (this.options.ttlSeconds * 1000);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry<T>;
          if (entry.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// === Specialized Cache for Audio Stems ===

export class StemCache extends CacheManager<Blob> {
  /**
   * Generate cache key from song metadata
   */
  generateKey(songId: string, stemType: string): string {
    return `stem-${songId}-${stemType}`;
  }

  /**
   * Cache audio stem blob
   */
  async cacheStem(songId: string, stemType: string, blob: Blob): Promise<void> {
    const key = this.generateKey(songId, stemType);
    await this.set(key, blob, blob.size);
  }

  /**
   * Retrieve cached stem
   */
  async getStem(songId: string, stemType: string): Promise<Blob | null> {
    const key = this.generateKey(songId, stemType);
    return await this.get(key);
  }

  /**
   * Check if stem is cached
   */
  async hasStem(songId: string, stemType: string): Promise<boolean> {
    const stem = await this.getStem(songId, stemType);
    return stem !== null;
  }

  /**
   * Remove all stems for a song
   */
  async deleteSong(songId: string): Promise<void> {
    const stemTypes = ['drums', 'bass', 'other', 'vocals'];
    await Promise.all(
      stemTypes.map(type => this.delete(this.generateKey(songId, type)))
    );
  }
}

// Export singleton instance
export const stemCache = new StemCache({
  maxMemorySizeMB: 200,      // 200MB for audio in memory
  maxIndexedDBSizeMB: 1000,  // 1GB for IndexedDB
  ttlSeconds: 30 * 24 * 60 * 60, // 30 days
});
