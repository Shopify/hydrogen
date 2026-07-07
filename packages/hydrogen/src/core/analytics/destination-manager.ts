import type { AnalyticsEventName } from "./events";
import type {
  PayloadFor,
  StorefrontAnalyticsConfig,
  StorefrontAnalyticsDestination,
} from "./types";

const MAX_REPLAY_BUFFER_SIZE = 500;

type ReplayEntry = {
  sequence: number;
  event: string;
  payload: unknown;
};

type DestinationRecord = {
  name: string;
  cleanup?: () => void;
  subscriptions: Map<string, Set<(payload: unknown) => void>>;
  nextReplaySequence: number;
};

/**
 * Delivers one buffered event to a destination's subscribed callbacks.
 * Always advances the destination replay cursor, even when it has no
 * subscribers for that event.
 */
function deliverDestinationEvent(destination: DestinationRecord, entry: ReplayEntry): void {
  const eventSubscriptions = destination.subscriptions.get(entry.event);
  if (!eventSubscriptions?.size) {
    destination.nextReplaySequence = Math.max(destination.nextReplaySequence, entry.sequence + 1);
    return;
  }

  for (const callback of eventSubscriptions) {
    try {
      callback(entry.payload);
    } catch (error) {
      console.error(`[h3] Error in analytics destination "${destination.name}":`, error);
    }
  }

  destination.nextReplaySequence = Math.max(destination.nextReplaySequence, entry.sequence + 1);
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
  const replayBuffer: ReplayEntry[] = [];
  const destinations = new Set<DestinationRecord>();
  const destinationNames = new Set<string>();

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
      }
      return;
    }

    shouldRecordReplay = true;
    for (const destination of destinations) {
      for (const entry of replayBuffer) {
        if (entry.sequence < destination.nextReplaySequence) continue;
        deliverDestinationEvent(destination, entry);
      }
    }
  }

  /**
   * Registers a destination integration. Runs setup synchronously or
   * asynchronously, then replays any buffered events the destination
   * subscribes to.
   *
   * @returns A function that removes the destination and runs its cleanup hook.
   */
  function addDestination(destination: StorefrontAnalyticsDestination): () => void {
    if (destinationNames.has(destination.name)) {
      console.error(`[h3] Analytics destination "${destination.name}" is already registered.`);
      return () => {};
    }

    destinationNames.add(destination.name);

    const destinationRecord: DestinationRecord = {
      name: destination.name,
      subscriptions: new Map(),
      nextReplaySequence: 0,
    };
    let removed = false;

    /** Subscribe callback passed to destination setup. No-op after removal. */
    const destinationSubscribe = <E extends AnalyticsEventName>(
      event: E,
      callback: (payload: PayloadFor<E>) => void,
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

      eventSubscriptions.add(callback as (payload: unknown) => void);
      return () => {
        const subscriptionsForEvent = destinationRecord.subscriptions.get(event);
        subscriptionsForEvent?.delete(callback as (payload: unknown) => void);
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
          console.error(
            `[h3] Error setting up analytics destination "${destination.name}":`,
            error,
          );
          removeDestination();
        });
      } else {
        finishSetup(setupResult as void | (() => void));
      }
    } catch (error) {
      console.error(`[h3] Error setting up analytics destination "${destination.name}":`, error);
      removeDestination();
    }

    return removeDestination;
  }

  /**
   * Records a published event in the replay buffer and delivers it to
   * destinations when tracking is allowed.
   */
  function onPublish(event: string, payload: unknown): void {
    const replayEntry = {
      sequence: nextReplaySequence++,
      event,
      payload,
    };

    if (shouldRecordReplay) {
      replayBuffer.push(replayEntry);
      if (replayBuffer.length > MAX_REPLAY_BUFFER_SIZE) {
        replayBuffer.shift();
      }
    }

    if (deps.canTrack()) {
      for (const destination of destinations) {
        deliverDestinationEvent(destination, replayEntry);
      }
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
  }

  return {
    addDestination,
    onPublish,
    replay,
    destroy,
  };
}
