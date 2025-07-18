import matchers from '@testing-library/jest-dom/matchers';

import {expect, vi} from 'vitest';
import {useLayoutEffect, useEffect} from 'react';
import * as React from 'react';

expect.extend(matchers);

// Mock use-isomorphic-layout-effect to fix XState tests
vi.mock('use-isomorphic-layout-effect', () => ({
  default: typeof window !== 'undefined' ? useLayoutEffect : useEffect
}));

// Fix for React 19 and XState compatibility
// Mock the shim to use React's built-in useSyncExternalStore
vi.mock('use-sync-external-store/shim', () => ({
  useSyncExternalStore: React.useSyncExternalStore || function(subscribe, getSnapshot, getServerSnapshot) {
    // Fallback implementation for tests
    const [state, setState] = React.useState(getSnapshot);
    
    React.useEffect(() => {
      const checkForUpdates = () => {
        const nextSnapshot = getSnapshot();
        setState(nextSnapshot);
      };
      
      const unsubscribe = subscribe(checkForUpdates);
      checkForUpdates();
      
      return unsubscribe;
    }, [subscribe, getSnapshot]);
    
    return state;
  }
}));

vi.mock('use-sync-external-store/shim/with-selector', () => ({
  useSyncExternalStoreWithSelector: React.useSyncExternalStore || function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
    const [state, setState] = React.useState(() => selector(getSnapshot()));
    
    React.useEffect(() => {
      const checkForUpdates = () => {
        const nextSnapshot = getSnapshot();
        const nextState = selector(nextSnapshot);
        setState(nextState);
      };
      
      const unsubscribe = subscribe(checkForUpdates);
      checkForUpdates();
      
      return unsubscribe;
    }, [subscribe, getSnapshot, selector]);
    
    return state;
  }
}));
