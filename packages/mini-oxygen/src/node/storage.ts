export class StorageFactory {
  storages: Map<string, MemoryStorage>;

  constructor() {
    this.storages = new Map();
  }

  storage(namespace: string) {
    let storage = this.storages.get(namespace);
    if (storage) return storage;
    // In Miniflare v4, we'll use a simple in-memory KV-like storage implementation
    this.storages.set(namespace, (storage = new MemoryStorage()));
    return storage;
  }
}

class MemoryStorage {
  private map = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = this.map.get(key) as T | undefined;
    return (value ?? null) as T | null;
  }

  async put<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  /**
   * Minimal implementation of KV list. Supports prefix filtering only.
   */
  async list(options: {prefix?: string} = {}): Promise<{keys: string[]}> {
    const keys = [...this.map.keys()].filter((k) =>
      options.prefix ? k.startsWith(options.prefix) : true,
    );
    return {keys};
  }
}
