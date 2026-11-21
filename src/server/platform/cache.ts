type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const entries = new Map<string, CacheEntry>();

function ttlMs() {
  const value = Number(process.env.PLATFORM_DIRECTORY_CACHE_TTL_MS ?? 60_000);
  return Number.isFinite(value) && value >= 0 ? value : 60_000;
}

function maxEntries() {
  const value = Number(process.env.PLATFORM_DIRECTORY_CACHE_MAX_ENTRIES ?? 1000);
  return Number.isInteger(value) && value > 0 ? value : 1000;
}

export function readCache<T>(tenantId: string, key: string): T | undefined {
  const cacheKey = `${tenantId}:${key}`;
  const entry = entries.get(cacheKey);

  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    entries.delete(cacheKey);
    return undefined;
  }

  entries.delete(cacheKey);
  entries.set(cacheKey, entry);
  return entry.value as T;
}

export function writeCache<T>(tenantId: string, key: string, value: T) {
  const cacheKey = `${tenantId}:${key}`;
  entries.delete(cacheKey);
  entries.set(cacheKey, { expiresAt: Date.now() + ttlMs(), value });

  while (entries.size > maxEntries()) {
    const oldestKey = entries.keys().next().value;
    if (oldestKey === undefined) break;
    entries.delete(oldestKey);
  }
}

export function clearPlatformDirectoryCache() {
  entries.clear();
}
