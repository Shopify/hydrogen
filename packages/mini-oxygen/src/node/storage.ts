export class StorageFactory {
  storages: Map<string, any>;

  constructor() {
    this.storages = new Map();
  }

  storage(namespace: string) {
    let storage = this.storages.get(namespace);
    if (storage) return storage;
    // In Miniflare v4, we'll use a simple in-memory storage implementation
    // or rely on Miniflare's built-in storage handling
    this.storages.set(namespace, (storage = new Map()));
    return storage;
  }
}
