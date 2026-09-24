import { consoleLogger } from "../logging";
import type { AnalyticsEventName } from "./events";
import { getTrackingValues } from "./tracking-values";
import type {
  PayloadFor,
  StorefrontAnalyticsConfig,
  StorefrontAnalyticsDestination,
  StorefrontAnalyticsDestinationEventContext,
} from "./types";

const MAX_REPLAY_BUFFER_SIZE = 500;

type ReplayEntry = {
  sequence: number;
  event: string;
  payload: unknown;
};

type DestinationCallback = (
  payload: unknown,
  context: StorefrontAnalyticsDestinationEventContext,
) => void;

type DestinationRecord = {
  name: string;
  context: StorefrontAnalyticsDestinationEventContext;
  cleanup?: () => void;
  subscriptions: Map<string, Set<DestinationCallback>>;
  nextReplaySequence: number;
  catchingUp: boolean;
};

/**
 * Delivers one buffered event to a destination's subscribed callbacks.
 * Always advances the destination replay cursor, even when it has no
 * subscribers for that event. The cursor advances before callbacks run, so a
 * callback that removes its own destination does not see the event again
 * when the destination is re-added.
 */
function deliverDestinationEvent(destination: DestinationRecord, entry: ReplayEntry): void {
  destination.nextReplaySequence = Math.max(destination.nextReplaySequence, entry.sequence + 1);

  const eventSubscriptions = destination.subscriptions.get(entry.event);
  if (eventSubscriptions === undefined) return;

  for (const callback of eventSubscriptions) {
    try {
      callback(entry.payload, destination.context);
    } catch (error) {
      consoleLogger.error(`error in analytics destination "${destination.name}"`, {
        scope: "analytics",
        error,
      });
    }
  }
}

type DestinationManagerDeps = {
  canTrack: () => boolean;
  getConfig: () => StorefrontAnalyticsConfig;
  isSupportedEvent?: (event: unknown) => boolean;
  warnUnsupportedEvent?: (event: unknown) => void;
};

/**
 * Creates a consent-gated destination registry with replay buffering.
 *
 * Destinations subscribe to events during setup and receive live delivery when
 * `canTrack()` returns true. Events published while blocked are buffered and
 * replayed once tracking is allowed.
 */
export function createDestinationManager(deps: DestinationManagerDeps) {
  let nextReplaySequence = 0;
  let shouldRecordReplay = true;
  // Holds contiguous sequences: recording only stops when the buffer is
  // cleared, so `catchUp()` can index it by sequence. A gap would make
  // catch-up silently skip entries, though it would still terminate.
  const replayBuffer: ReplayEntry[] = [];
  const destinations = new Set<DestinationRecord>();
  const destinationNames = new Set<string>();
  // Replay cursors of removed destinations, keyed by name. Re-adding a name
  // resumes from its cursor, so each retained event reaches a destination name
  // at most once, even across component remounts.
  const removedReplayCursors = new Map<string, number>();

  /**
   * Delivers the retained events a destination has not processed yet, oldest
   * first, while tracking stays allowed. Re-reads the buffer on every step
   * because callbacks may publish, which appends to it and can evict its
   * oldest entry. A nested call for the same destination returns straight
   * away and the outer loop picks up the new entries, so every callback sees
   * events in order. Entries published during a catch-up, including by other
   * destinations' callbacks, share the same buffer; if the backlog plus those
   * publishes exceed it, this destination can miss the oldest. More than a
   * buffer's worth of publishes during one catch-up is treated as a feedback
   * loop and stops the catch-up instead of hanging the page.
   */
  function catchUp(destination: DestinationRecord): void {
    if (destination.catchingUp) return;
    destination.catchingUp = true;
    const startSequence = nextReplaySequence;
    try {
      while (deps.canTrack()) {
        if (nextReplaySequence - startSequence > MAX_REPLAY_BUFFER_SIZE) {
          consoleLogger.error(
            `too many analytics events were published while delivering to destination "${destination.name}"`,
            { scope: "analytics" },
          );
          return;
        }
        const oldest = replayBuffer[0];
        if (oldest === undefined) return;
        const entry = replayBuffer[Math.max(0, destination.nextReplaySequence - oldest.sequence)];
        if (entry === undefined) return;
        deliverDestinationEvent(destination, entry);
      }
    } finally {
      destination.catchingUp = false;
    }
  }

  /**
   * Saves a removed destination's cursor for a later re-add. Cursors at or
   * before the oldest retained event behave like a fresh name, so they are
   * dropped and the map only holds cursors that still differ from one.
   */
  function rememberReplayCursor(name: string, cursor: number): void {
    const oldestRetainedSequence = replayBuffer[0]?.sequence ?? nextReplaySequence;
    for (const [removedName, removedCursor] of removedReplayCursors) {
      if (removedCursor <= oldestRetainedSequence) removedReplayCursors.delete(removedName);
    }
    if (cursor > oldestRetainedSequence) removedReplayCursors.set(name, cursor);
  }

  /**
   * Replays buffered events to all registered destinations.
   *
   * @param clearWhenBlocked - When true and tracking is blocked, clears the
   *   replay buffer and stops recording until tracking is allowed again.
   */
  function replay(clearWhenBlocked = false): void {
    if (!deps.canTrack()) {
      if (clearWhenBlocked) {
        replayBuffer.length = 0;
        shouldRecordReplay = false;
        removedReplayCursors.clear();
      }
      return;
    }

    shouldRecordReplay = true;
    for (const destination of destinations) {
      catchUp(destination);
    }
  }

  /**
   * Registers a destination integration. Runs setup synchronously or
   * asynchronously, then replays any buffered events the destination
   * subscribes to. Re-adding a previously removed name resumes after the last
   * event processed for that name, including events it did not subscribe to.
   *
   * @returns A function that removes the destination and runs its cleanup hook.
   */
  function addDestination(destination: StorefrontAnalyticsDestination): () => void {
    if (destinationNames.has(destination.name)) {
      consoleLogger.warn(`analytics destination "${destination.name}" is already registered`, {
        scope: "analytics",
      });
      return () => {};
    }

    destinationNames.add(destination.name);
    const initialReplaySequence = removedReplayCursors.get(destination.name) ?? 0;
    removedReplayCursors.delete(destination.name);

    const tag = `hydrogen:${destination.name}`;
    const destinationRecord: DestinationRecord = {
      name: destination.name,
      context: {
        // Destinations may retain this getter beyond the delivery callback, so
        // re-check consent at call time rather than trusting delivery gating.
        getTrackingValues: () =>
          deps.canTrack() ? getTrackingValues(tag) : { uniqueToken: "", visitToken: "" },
      },
      subscriptions: new Map(),
      nextReplaySequence: initialReplaySequence,
      catchingUp: false,
    };
    let removed = false;

    /** Subscribe callback passed to destination setup. No-op after removal. */
    const destinationSubscribe = <E extends AnalyticsEventName>(
      event: E,
      callback: (
        payload: PayloadFor<E>,
        context: StorefrontAnalyticsDestinationEventContext,
      ) => void,
    ) => {
      if (removed) {
        return () => {};
      }
      if (deps.isSupportedEvent && !deps.isSupportedEvent(event)) {
        deps.warnUnsupportedEvent?.(event);
        return () => {};
      }

      let eventSubscriptions = destinationRecord.subscriptions.get(event);
      if (!eventSubscriptions) {
        eventSubscriptions = new Set();
        destinationRecord.subscriptions.set(event, eventSubscriptions);
      }

      eventSubscriptions.add(callback as DestinationCallback);
      return () => {
        const subscriptionsForEvent = destinationRecord.subscriptions.get(event);
        subscriptionsForEvent?.delete(callback as DestinationCallback);
        if (subscriptionsForEvent?.size === 0) {
          destinationRecord.subscriptions.delete(event);
        }
      };
    };

    /** Removes the destination from the registry and runs cleanup. */
    const removeDestination = () => {
      if (removed) return;
      removed = true;
      destinations.delete(destinationRecord);
      destinationNames.delete(destination.name);
      rememberReplayCursor(destination.name, destinationRecord.nextReplaySequence);
      // Empty each set too, so a delivery loop already iterating one stops.
      for (const callbacks of destinationRecord.subscriptions.values()) callbacks.clear();
      destinationRecord.subscriptions.clear();
      destinationRecord.cleanup?.();
    };

    /** Activates the destination after setup completes and replays buffered events. */
    const finishSetup = (cleanup?: void | (() => void)) => {
      if (removed) {
        cleanup?.();
        return;
      }
      if (typeof cleanup === "function") {
        destinationRecord.cleanup = cleanup;
      }
      destinations.add(destinationRecord);
      replay();
    };

    try {
      const setupResult = destination.setup({
        subscribe: destinationSubscribe,
        getConfig: deps.getConfig,
      });

      if (setupResult && typeof (setupResult as PromiseLike<unknown>).then === "function") {
        const setupPromise = setupResult as Promise<void | (() => void)>;
        setupPromise.then(finishSetup).catch((error: unknown) => {
          consoleLogger.error(`error setting up analytics destination "${destination.name}"`, {
            scope: "analytics",
            error,
          });
          removeDestination();
        });
      } else {
        finishSetup(setupResult as void | (() => void));
      }
    } catch (error) {
      consoleLogger.error(`error setting up analytics destination "${destination.name}"`, {
        scope: "analytics",
        error,
      });
      removeDestination();
    }

    return removeDestination;
  }

  /**
   * Records a published event in the replay buffer and, when tracking is
   * allowed, brings every destination up to date. A destination still behind
   * on replay receives its earlier events first, so events published from a
   * callback never make it skip ones it has not seen.
   */
  function onPublish(event: string, payload: unknown): void {
    const canTrack = deps.canTrack();
    // Live delivery reads from the buffer, so a trackable event must be recorded.
    if (canTrack) shouldRecordReplay = true;

    if (shouldRecordReplay) {
      replayBuffer.push({ sequence: nextReplaySequence, event, payload });
      if (replayBuffer.length > MAX_REPLAY_BUFFER_SIZE) {
        replayBuffer.shift();
      }
    }
    nextReplaySequence++;

    if (!canTrack) return;
    for (const destination of destinations) {
      catchUp(destination);
    }
  }

  /** Clears the replay buffer and tears down all destination subscriptions. */
  function destroy(): void {
    replayBuffer.length = 0;
    for (const destination of destinations) {
      destination.subscriptions.clear();
      destination.cleanup?.();
    }
    destinations.clear();
    destinationNames.clear();
    removedReplayCursors.clear();
  }

  return {
    addDestination,
    onPublish,
    replay,
    destroy,
  };
}
