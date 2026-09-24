import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

import { createDestinationManager } from "./destination-manager";
import type {
  ShopAnalytics,
  StorefrontAnalyticsConfig,
  StorefrontAnalyticsDestinationSetupContext,
} from "./types";

const SHOP_DATA: ShopAnalytics = {
  shopId: "gid://shopify/Shop/1",
  channel: "hydrogen",
  storefrontId: "0",
};

const CONSENT_DATA = {};
const DESTINATION_CONTEXT = { getTrackingValues: expect.any(Function) };

const CONFIG: StorefrontAnalyticsConfig = {
  shop: SHOP_DATA,
  consent: CONSENT_DATA,
};

const noop = () => {};

function deliveredPayloads(callback: Mock): unknown[] {
  return callback.mock.calls.map((call: unknown[]) => call[0]);
}

function createTestManager(canTrack: () => boolean = () => true) {
  const getConfig = vi.fn(() => CONFIG);
  const manager = createDestinationManager({ canTrack, getConfig });
  return { manager, getConfig };
}

describe("createDestinationManager", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("live delivery", () => {
    it("delivers events to destinations when tracking is allowed", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      manager.onPublish("page_viewed", { url: "/live" });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith({ url: "/live" }, DESTINATION_CONTEXT);
    });

    it("does not deliver events when tracking is blocked", () => {
      const { manager } = createTestManager(() => false);
      const destination = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      manager.onPublish("page_viewed", { url: "/blocked" });

      expect(destination).not.toHaveBeenCalled();
    });
  });

  describe("replay", () => {
    it("replays buffered events after tracking is granted", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      manager.onPublish("page_viewed", { url: "/buffered" });
      expect(destination).not.toHaveBeenCalled();

      canTrack = true;
      manager.replay();

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith({ url: "/buffered" }, DESTINATION_CONTEXT);
    });

    it("replays buffered events to destinations added after tracking is granted", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();

      manager.onPublish("page_viewed", { url: "/early" });

      canTrack = true;
      manager.replay();

      manager.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith({ url: "/early" }, DESTINATION_CONTEXT);
    });

    it("clears the replay buffer when replay is called with clearWhenBlocked", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();

      manager.onPublish("page_viewed", { url: "/denied" });
      manager.replay(true);

      canTrack = true;
      manager.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).not.toHaveBeenCalled();
    });

    it("replays supported non-page events to destinations", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();

      manager.onPublish("search_viewed", { shop: SHOP_DATA, searchTerm: "snowboard" });
      manager.addDestination({
        name: "late-destination",
        setup({ subscribe }) {
          subscribe("search_viewed", destination);
        },
      });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith(
        { shop: SHOP_DATA, searchTerm: "snowboard" },
        DESTINATION_CONTEXT,
      );
    });

    it("replays each buffered event to a destination only once", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();

      manager.onPublish("page_viewed", { url: "/one" });
      manager.onPublish("page_viewed", { url: "/two" });

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      canTrack = true;
      manager.replay();
      manager.replay();

      expect(destination).toHaveBeenCalledTimes(2);
      expect(destination).toHaveBeenNthCalledWith(1, { url: "/one" }, DESTINATION_CONTEXT);
      expect(destination).toHaveBeenNthCalledWith(2, { url: "/two" }, DESTINATION_CONTEXT);
    });

    it("drops the oldest buffered events when the replay buffer exceeds its max size", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();

      for (let i = 0; i < 501; i++) {
        manager.onPublish("page_viewed", { url: `/event-${i}` });
      }

      canTrack = true;
      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).toHaveBeenCalledTimes(500);
      expect(destination).not.toHaveBeenCalledWith({ url: "/event-0" }, DESTINATION_CONTEXT);
      expect(destination).toHaveBeenCalledWith({ url: "/event-500" }, DESTINATION_CONTEXT);
    });
  });

  describe("destination setup", () => {
    it("rejects duplicate destination names without running setup", () => {
      const errorSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { manager } = createTestManager(() => true);
      const firstSetup = vi.fn(({ subscribe }: StorefrontAnalyticsDestinationSetupContext) => {
        subscribe("page_viewed", () => {});
      });
      const duplicateSetup = vi.fn();

      manager.addDestination({
        name: "ga4",
        setup: firstSetup,
      });
      const removeDuplicate = manager.addDestination({
        name: "ga4",
        setup: duplicateSetup,
      });

      expect(firstSetup).toHaveBeenCalledOnce();
      expect(duplicateSetup).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        '[hydrogen:warn:analytics] analytics destination "ga4" is already registered',
      );

      removeDuplicate();
      errorSpy.mockRestore();
    });

    it("allows re-registering a destination name after removal", () => {
      const { manager } = createTestManager(() => true);
      const first = vi.fn();
      const second = vi.fn();

      const removeFirst = manager.addDestination({
        name: "ga4",
        setup({ subscribe }) {
          subscribe("page_viewed", first);
        },
      });

      removeFirst();
      manager.addDestination({
        name: "ga4",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });

      manager.onPublish("page_viewed", { url: "/after-reregister" });

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledOnce();
    });

    it("reserves destination names while async setup is pending", async () => {
      const errorSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { manager } = createTestManager(() => true);
      let finishSetup: (() => void) | undefined;

      manager.addDestination({
        name: "ga4",
        async setup() {
          await new Promise<void>((resolve) => {
            finishSetup = resolve;
          });
        },
      });

      manager.addDestination({
        name: "ga4",
        setup() {},
      });

      expect(errorSpy).toHaveBeenCalledWith(
        '[hydrogen:warn:analytics] analytics destination "ga4" is already registered',
      );

      finishSetup?.();
      errorSpy.mockRestore();
    });

    it("passes getConfig to destination setup", () => {
      const { manager, getConfig } = createTestManager();
      const setup = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup,
      });

      expect(setup).toHaveBeenCalledWith(
        expect.objectContaining({
          getConfig,
          subscribe: expect.any(Function),
        }),
      );
      expect(getConfig()).toEqual(CONFIG);
    });

    it("waits for async destination setup before replaying buffered events", async () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();
      let finishSetup: (() => void) | undefined;

      manager.onPublish("page_viewed", { url: "/early" });
      manager.addDestination({
        name: "async-destination",
        async setup({ subscribe }) {
          await new Promise<void>((resolve) => {
            finishSetup = resolve;
          });
          subscribe("page_viewed", destination);
        },
      });

      expect(destination).not.toHaveBeenCalled();
      finishSetup?.();
      await vi.waitFor(() => {
        expect(destination).toHaveBeenCalledOnce();
      });
    });

    it("does not register destinations when sync setup throws", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();

      manager.addDestination({
        name: "broken-destination",
        setup() {
          throw new Error("setup failed");
        },
      });

      manager.onPublish("page_viewed", { url: "/after-error" });

      expect(destination).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        '[hydrogen:error:analytics] error setting up analytics destination "broken-destination"',
        expect.any(Error),
      );
      errorSpy.mockRestore();
    });

    it("does not register destinations when async setup rejects", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();

      manager.addDestination({
        name: "broken-async-destination",
        setup() {
          return Promise.reject(new Error("async setup failed"));
        },
      });

      await vi.waitFor(() => {
        expect(errorSpy).toHaveBeenCalledWith(
          '[hydrogen:error:analytics] error setting up analytics destination "broken-async-destination"',
          expect.any(Error),
        );
      });

      manager.onPublish("page_viewed", { url: "/after-error" });
      expect(destination).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("destination lifecycle", () => {
    it("cleans up destination subscriptions and runs cleanup", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();
      const cleanup = vi.fn();

      const removeDestination = manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
          return cleanup;
        },
      });

      removeDestination();
      manager.onPublish("page_viewed", { url: "/after-cleanup" });

      expect(destination).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledOnce();
    });

    it("returns a no-op unsubscribe after destination removal", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();
      let unsubscribe = noop;

      const removeDestination = manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          unsubscribe = subscribe("page_viewed", destination);
        },
      });

      removeDestination();
      unsubscribe();
      manager.onPublish("page_viewed", { url: "/after-removal" });

      expect(destination).not.toHaveBeenCalled();
    });

    it("supports unsubscribing from individual destination events", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();
      let unsubscribe = noop;

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          unsubscribe = subscribe("page_viewed", destination);
        },
      });

      manager.onPublish("page_viewed", { url: "/before" });
      unsubscribe();
      manager.onPublish("page_viewed", { url: "/after" });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith({ url: "/before" }, DESTINATION_CONTEXT);
    });

    it("does not replay delivered events when a destination is removed and re-added", () => {
      const { manager } = createTestManager(() => true);
      const first = vi.fn();
      const second = vi.fn();

      manager.onPublish("page_viewed", { url: "/a" });
      manager.onPublish("page_viewed", { url: "/b" });

      const removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", first);
        },
      });
      removeFirst();
      manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });
      manager.onPublish("page_viewed", { url: "/c" });

      expect(deliveredPayloads(first)).toEqual([{ url: "/a" }, { url: "/b" }]);
      expect(deliveredPayloads(second)).toEqual([{ url: "/c" }]);
    });

    it("replays events published while a destination was removed once it is re-added", () => {
      const { manager } = createTestManager(() => true);
      const first = vi.fn();
      const second = vi.fn();

      manager.onPublish("page_viewed", { url: "/before-removal" });
      const removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", first);
        },
      });
      removeFirst();
      manager.onPublish("page_viewed", { url: "/while-removed" });
      manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });

      expect(deliveredPayloads(first)).toEqual([{ url: "/before-removal" }]);
      expect(deliveredPayloads(second)).toEqual([{ url: "/while-removed" }]);
    });

    it("replays buffered events once when a destination remounts before consent is granted", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();
      const register = () =>
        manager.addDestination({
          name: "component-destination",
          setup({ subscribe }) {
            subscribe("page_viewed", destination);
          },
        });

      manager.onPublish("page_viewed", { url: "/buffered" });
      // Mirrors React Strict Mode: mount, unmount, mount.
      const removeFirst = register();
      removeFirst();
      register();

      canTrack = true;
      manager.replay();

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith({ url: "/buffered" }, DESTINATION_CONTEXT);
    });

    it("does not redeliver the event a destination removed itself during", () => {
      const { manager } = createTestManager(() => true);
      const second = vi.fn();
      let removeFirst = noop;

      removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", () => removeFirst());
        },
      });
      manager.onPublish("page_viewed", { url: "/removes-itself" });
      manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });

      expect(second).not.toHaveBeenCalled();
    });

    it("keeps the resumed cursor when a re-added destination is removed during async setup", async () => {
      const { manager } = createTestManager(() => true);
      const pending = vi.fn();
      const resumed = vi.fn();
      let finishSetup = noop;

      manager.onPublish("page_viewed", { url: "/a" });
      const removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", noop);
        },
      });
      removeFirst();
      const removePending = manager.addDestination({
        name: "component-destination",
        async setup({ subscribe }) {
          subscribe("page_viewed", pending);
          await new Promise<void>((resolve) => {
            finishSetup = resolve;
          });
        },
      });
      removePending();
      manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", resumed);
        },
      });
      finishSetup();
      await Promise.resolve();

      expect(pending).not.toHaveBeenCalled();
      expect(resumed).not.toHaveBeenCalled();
    });

    it("delivers only to the remounted destination when an async setup resolves after removal", async () => {
      const { manager } = createTestManager(() => true);
      const first = vi.fn();
      const second = vi.fn();
      const firstCleanup = vi.fn();
      let finishFirstSetup = noop;

      manager.onPublish("page_viewed", { url: "/a" });
      const removeFirst = manager.addDestination({
        name: "component-destination",
        async setup({ subscribe }) {
          subscribe("page_viewed", first);
          await new Promise<void>((resolve) => {
            finishFirstSetup = resolve;
          });
          return firstCleanup;
        },
      });
      removeFirst();
      manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });
      finishFirstSetup();

      await vi.waitFor(() => {
        expect(firstCleanup).toHaveBeenCalledOnce();
      });
      expect(first).not.toHaveBeenCalled();
      expect(deliveredPayloads(second)).toEqual([{ url: "/a" }]);
    });

    it("does not redeliver the event a destination removed itself during on replay", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const second = vi.fn();
      let removeFirst = noop;

      manager.onPublish("page_viewed", { url: "/a" });
      manager.onPublish("page_viewed", { url: "/b" });
      removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", () => removeFirst());
        },
      });
      canTrack = true;
      manager.replay();
      manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });

      expect(deliveredPayloads(second)).toEqual([{ url: "/b" }]);
    });

    it("stops a removed destination's remaining callbacks for the current event", () => {
      const { manager } = createTestManager(() => true);
      const later = vi.fn();
      let removeDestination = noop;

      removeDestination = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", () => removeDestination());
          subscribe("page_viewed", later);
        },
      });
      manager.onPublish("page_viewed", { url: "/a" });

      expect(later).not.toHaveBeenCalled();
    });

    it("keeps replay cursors separate per destination name", () => {
      const { manager } = createTestManager(() => true);
      const other = vi.fn();

      manager.onPublish("page_viewed", { url: "/a" });
      const removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", noop);
        },
      });
      removeFirst();
      manager.addDestination({
        name: "other-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", other);
        },
      });

      expect(other).toHaveBeenCalledOnce();
      expect(other).toHaveBeenCalledWith({ url: "/a" }, DESTINATION_CONTEXT);
    });

    it("destroys all destinations and runs cleanup", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();
      const cleanup = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
          return cleanup;
        },
      });

      manager.destroy();
      manager.onPublish("page_viewed", { url: "/after-destroy" });

      expect(destination).not.toHaveBeenCalled();
      expect(cleanup).toHaveBeenCalledOnce();
    });
  });

  describe("re-entrant delivery", () => {
    it("finishes replay in order when a callback publishes during replay", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn((payload: { url?: string }) => {
        if (payload.url === "/1") manager.onPublish("page_viewed", { url: "/published" });
      });

      manager.onPublish("page_viewed", { url: "/1" });
      manager.onPublish("page_viewed", { url: "/2" });
      manager.onPublish("page_viewed", { url: "/3" });
      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      canTrack = true;
      manager.replay();

      expect(deliveredPayloads(destination)).toEqual([
        { url: "/1" },
        { url: "/2" },
        { url: "/3" },
        { url: "/published" },
      ]);
    });

    it("delivers in order to every destination when a callback publishes during live delivery", () => {
      const { manager } = createTestManager(() => true);
      const first = vi.fn((payload: { url?: string }) => {
        if (payload.url === "/1") manager.onPublish("page_viewed", { url: "/2" });
      });
      const second = vi.fn();

      manager.addDestination({
        name: "first-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", first);
        },
      });
      manager.addDestination({
        name: "second-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", second);
        },
      });
      manager.onPublish("page_viewed", { url: "/1" });

      expect(deliveredPayloads(first)).toEqual([{ url: "/1" }, { url: "/2" }]);
      expect(deliveredPayloads(second)).toEqual([{ url: "/1" }, { url: "/2" }]);
    });

    it("delivers in order to every callback of a destination when one callback publishes", () => {
      const { manager } = createTestManager(() => true);
      const calls: string[] = [];

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", (payload) => {
            calls.push(`first:${payload.url}`);
            if (payload.url === "/1") manager.onPublish("page_viewed", { url: "/2" });
          });
          subscribe("page_viewed", (payload) => {
            calls.push(`second:${payload.url}`);
          });
        },
      });
      manager.onPublish("page_viewed", { url: "/1" });

      expect(calls).toEqual(["first:/1", "second:/1", "first:/2", "second:/2"]);
    });

    it("stops catching up when a callback revokes tracking", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn(() => {
        canTrack = false;
      });

      manager.onPublish("page_viewed", { url: "/1" });
      manager.onPublish("page_viewed", { url: "/2" });
      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      canTrack = true;
      manager.replay();

      expect(deliveredPayloads(destination)).toEqual([{ url: "/1" }]);
    });

    it("delivers buffered events before a live event published ahead of replay", () => {
      let canTrack = false;
      const { manager } = createTestManager(() => canTrack);
      const destination = vi.fn();

      manager.onPublish("page_viewed", { url: "/buffered" });
      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", destination);
        },
      });
      canTrack = true;
      manager.onPublish("page_viewed", { url: "/live" });

      expect(deliveredPayloads(destination)).toEqual([{ url: "/buffered" }, { url: "/live" }]);
    });

    it("delivers the current event once to a destination added from a callback", () => {
      const { manager } = createTestManager(() => true);
      const added = vi.fn();
      let registered = false;

      manager.addDestination({
        name: "first-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", () => {
            if (registered) return;
            registered = true;
            manager.addDestination({
              name: "added-destination",
              setup({ subscribe: subscribeAdded }) {
                subscribeAdded("page_viewed", added);
              },
            });
          });
        },
      });
      manager.onPublish("page_viewed", { url: "/1" });

      expect(deliveredPayloads(added)).toEqual([{ url: "/1" }]);
    });

    it("does not redeliver the current event when a callback removes and re-adds its destination", () => {
      const { manager } = createTestManager(() => true);
      const readded = vi.fn();
      let removeFirst = noop;

      removeFirst = manager.addDestination({
        name: "component-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", () => {
            removeFirst();
            manager.addDestination({
              name: "component-destination",
              setup({ subscribe: subscribeReadded }) {
                subscribeReadded("page_viewed", readded);
              },
            });
          });
        },
      });
      manager.onPublish("page_viewed", { url: "/1" });
      manager.onPublish("page_viewed", { url: "/2" });

      expect(deliveredPayloads(readded)).toEqual([{ url: "/2" }]);
    });
  });

  describe("error handling and isolation", () => {
    it("catches destination callback errors without breaking other callbacks", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { manager } = createTestManager(() => true);
      const healthyDestination = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("page_viewed", () => {
            throw new Error("destination failed");
          });
          subscribe("page_viewed", healthyDestination);
        },
      });

      manager.onPublish("page_viewed", { url: "/test" });

      expect(healthyDestination).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledWith(
        '[hydrogen:error:analytics] error in analytics destination "test-destination"',
        expect.any(Error),
      );
      errorSpy.mockRestore();
    });

    it("isolates delivery across destinations", () => {
      const { manager } = createTestManager(() => true);
      const destinationA = vi.fn();
      const destinationB = vi.fn();

      manager.addDestination({
        name: "destination-a",
        setup({ subscribe }) {
          subscribe("page_viewed", destinationA);
        },
      });
      manager.addDestination({
        name: "destination-b",
        setup({ subscribe }) {
          subscribe("product_viewed", destinationB);
        },
      });

      manager.onPublish("page_viewed", { url: "/page" });
      manager.onPublish("product_viewed", { id: "p1" });

      expect(destinationA).toHaveBeenCalledOnce();
      expect(destinationB).toHaveBeenCalledOnce();
      expect(destinationA).not.toHaveBeenCalledWith({ id: "p1" }, DESTINATION_CONTEXT);
      expect(destinationB).not.toHaveBeenCalledWith({ url: "/page" }, DESTINATION_CONTEXT);
    });

    it("advances replay cursor for unsubscribed events without delivering them", () => {
      const { manager } = createTestManager(() => true);
      const destination = vi.fn();

      manager.addDestination({
        name: "test-destination",
        setup({ subscribe }) {
          subscribe("product_viewed", destination);
        },
      });

      manager.onPublish("page_viewed", { url: "/skipped" });
      manager.onPublish("product_viewed", { id: "p1" });

      expect(destination).toHaveBeenCalledOnce();
      expect(destination).toHaveBeenCalledWith({ id: "p1" }, DESTINATION_CONTEXT);
    });
  });
});
