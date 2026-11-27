/** Mirrors the CDN `CollectionUpdateEvent`: a bubbling event that carries the payload fields. */
class FakeCollectionUpdateEvent extends Event {
  constructor(payload: Record<string, unknown>) {
    super("shopify:collection:update", { bubbles: true });
    Object.assign(this, payload);
  }
}

/**
 * The update events of a Standard Events module, for a mocked `importStandardEventsFromCDN`. In a
 * `vi.mock` factory, load it with `await import`.
 */
export const fakeStandardEvents = {
  CollectionUpdateEvent: FakeCollectionUpdateEvent,
};
