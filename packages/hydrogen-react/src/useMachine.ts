// Inlined React binding for xstate/fsm's state machine interpreter.
//
// This replaces the xstate/react/fsm entrypoint, which had no official version
// supporting both React 19 and xstate/fsm. By owning this hook, we eliminate
// the xstate/react dependency (and its React version peer dep constraint)
// while keeping xstate/fsm and the cart state machine definition unchanged.
//
// Adapted from xstate/react v3.2.1/fsm (MIT license, Stately/xstate).
import {
  createMachine,
  interpret,
  InterpreterStatus,
  StateMachine,
  EventObject,
} from '@xstate/fsm';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

// useLayoutEffect in the browser (sync after DOM mutations, before paint),
// useEffect on the server (where useLayoutEffect warns). This matches the
// original xstate/react behavior via use-isomorphic-layout-effect.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function useConstant<T>(fn: () => T): T {
  const ref = useRef<{v: T}>();
  if (!ref.current) {
    ref.current = {v: fn()};
  }
  return ref.current.v;
}

function getServiceState<
  TC extends object,
  TE extends EventObject,
  TS extends {value: any; context: TC},
>(service: StateMachine.Service<TC, TE, TS>): StateMachine.State<TC, TE, TS> {
  let currentValue!: StateMachine.State<TC, TE, TS>;
  service.subscribe((state) => (currentValue = state)).unsubscribe();
  return currentValue;
}

export function useMachine<
  TC extends object,
  TE extends EventObject,
  TS extends {value: any; context: TC},
>(
  stateMachine: StateMachine.Machine<TC, TE, TS>,
  options?: {actions?: StateMachine.ActionMap<TC, TE>},
): readonly [
  StateMachine.State<TC, TE, TS>,
  StateMachine.Service<TC, TE, TS>['send'],
  StateMachine.Service<TC, TE, TS>,
] {
  const persistedStateRef = useRef<StateMachine.State<TC, TE, TS>>();

  const [service, queue] = useConstant(() => {
    const eventQueue: Array<TE | TE['type']> = [];
    const svc = interpret(
      createMachine(
        stateMachine.config,
        options ? options : (stateMachine as any)._options,
      ),
    );
    const originalSend = svc.send;
    svc.send = (event: TE | TE['type']) => {
      if (svc.status === InterpreterStatus.NotStarted) {
        eventQueue.push(event);
        return;
      }
      originalSend(event);
      persistedStateRef.current = svc.state;
    };
    return [svc, eventQueue] as const;
  });

  // Keep action implementations in sync without re-creating the service.
  // useIsomorphicLayoutEffect ensures this runs before child effects and paint,
  // preventing a window where stale action handlers could be invoked.
  useIsomorphicLayoutEffect(() => {
    if (options) {
      (service as any)._machine._options = options;
    }
  });

  const getSnapshot = useCallback(() => getServiceState(service), [service]);

  const subscribe = useCallback(
    (handleStoreChange: () => void) => {
      const {unsubscribe} = service.subscribe(handleStoreChange);
      return unsubscribe;
    },
    [service],
  );

  const storeSnapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  useEffect(() => {
    service.start(persistedStateRef.current as any);
    queue.forEach(service.send);
    persistedStateRef.current = service.state;
    return () => {
      service.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [storeSnapshot, service.send, service] as const;
}
