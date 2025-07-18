import matchers from '@testing-library/jest-dom/matchers';

import {expect, vi} from 'vitest';
import * as React from 'react';

expect.extend(matchers);

// Mock use-sync-external-store for XState v6.0.0 compatibility with React 19
vi.mock('use-sync-external-store/shim', () => ({
  useSyncExternalStore: React.useSyncExternalStore || function(subscribe, getSnapshot, getServerSnapshot) {
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
