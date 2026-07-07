import { describe, it, expect, vi, beforeEach } from "vitest";

import { createDestinationManager } from "./destination-manager";
import type {
  ShopAnalytics,
  StorefrontAnalyticsConfig,
  StorefrontAnalyticsDestinationSetupContext,
} from "./types";

const SHOP_DATA: ShopAnalytics = {
  shopId: "gid://shopify/Shop/1",
  acceptedLanguage: "EN",
  currency: "USD",
  hydrogenSubchannelId: "0",
};

const CONSENT_DATA = {
  consentDomain: "checkout.hydrogen.shop",
  publicStorefrontAccessToken: "33ad0f277e864013b8e3c21d19432501",
};

const CONFIG: StorefrontAnalyticsConfig = {
  shop: SHOP_DATA,
  consent: CONSENT_DATA,
};

const noop = () => {};

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
      expect(destination).toHaveBeenCalledWith({ url: "/live" });
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
      expect(destination).toHaveBeenCalledWith({ url: "/buffered" });
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
      expect(destination).toHaveBeenCalledWith({ url: "/early" });
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
      expect(destination).toHaveBeenCalledWith({ shop: SHOP_DATA, searchTerm: "snowboard" });
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
      expect(destination).toHaveBeenNthCalledWith(1, { url: "/one" });
      expect(destination).toHaveBeenNthCalledWith(2, { url: "/two" });
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
      expect(destination).not.toHaveBeenCalledWith({ url: "/event-0" });
      expect(destination).toHaveBeenCalledWith({ url: "/event-500" });
    });
  });

  describe("destination setup", () => {
    it("rejects duplicate destination names without running setup", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
        '[h3] Analytics destination "ga4" is already registered.',
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
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
        '[h3] Analytics destination "ga4" is already registered.',
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
        '[h3] Error setting up analytics destination "broken-destination":',
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
          '[h3] Error setting up analytics destination "broken-async-destination":',
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
      expect(destination).toHaveBeenCalledWith({ url: "/before" });
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
        '[h3] Error in analytics destination "test-destination":',
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
      expect(destinationA).not.toHaveBeenCalledWith({ id: "p1" });
      expect(destinationB).not.toHaveBeenCalledWith({ url: "/page" });
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
      expect(destination).toHaveBeenCalledWith({ id: "p1" });
    });
  });
});
