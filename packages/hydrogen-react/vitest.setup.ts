import matchers from '@testing-library/jest-dom/matchers';

import {expect, vi} from 'vitest';
import {useLayoutEffect, useEffect} from 'react';

expect.extend(matchers);

// Mock use-isomorphic-layout-effect to fix XState tests
vi.mock('use-isomorphic-layout-effect', () => ({
  default: typeof window !== 'undefined' ? useLayoutEffect : useEffect
}));
