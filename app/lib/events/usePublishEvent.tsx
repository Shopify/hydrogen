import {useRef, useEffect} from 'react';
import {HydrogenEvent} from '~/lib/events';

interface UsePublishEvent {
  event: string;
  condition: boolean;
  payload?: object;
  delay?: 1_000;
}

export function usePublishEvent(config: UsePublishEvent, dependencies: any[]) {
  const configRef = useRef(config);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!config) return;
    if (!config.condition) return;
    if (!config.event) return;
    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      HydrogenEvent.publish(configRef.current.event, configRef.current.payload);
      timerRef.current = null;
      clearTimeout(timerRef.current);
    }, config?.delay || 1_000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies || []);

  // this effect caches the config ref when state changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);
}
