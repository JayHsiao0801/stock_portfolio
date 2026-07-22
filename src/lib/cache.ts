/**
 * 簡單的 in-memory TTL 快取，適合單機、輕量部署（無需 Redis）。
 *
 * 每個 key 各自獨立計時，因此像股票報價這種依代號區分的資料，
 * 可以用 `stock-price:${ticker}` 這樣的 key 分開快取，不會互相覆蓋。
 */

type CacheEntry<T> = { value: T; time: number };

const store = new Map<string, CacheEntry<unknown>>();

/**
 * 讀取快取；若不存在或已過期，呼叫 `fetcher` 取得新值並存入快取後回傳。
 *
 * 若 `fetcher` 失敗，且該 key 之前有快取值（即使已過期），會降級回傳該舊值，
 * 而不是讓錯誤往外拋，讓 API 在外部服務暫時失效時仍能回應堪用的資料。
 * 只有在完全沒有任何快取值可用時，才會把原始錯誤往外拋出。
 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = store.get(key) as CacheEntry<T> | undefined;
  if (cached && Date.now() - cached.time < ttlMs) {
    return cached.value;
  }

  try {
    const value = await fetcher();
    store.set(key, { value, time: Date.now() });
    return value;
  } catch (err) {
    if (cached) return cached.value;
    throw err;
  }
}
