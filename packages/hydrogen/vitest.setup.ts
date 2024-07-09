import matchers from '@testing-library/jest-dom/matchers';

import {expect} from 'vitest';

expect.extend(matchers);

// Defining `document.currentScript` to avoid errors in tests
Object.defineProperty(document, 'currentScript', {
  value: document.createElement('script'),
});
