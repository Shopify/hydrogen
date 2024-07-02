import matchers from '@testing-library/jest-dom/matchers';

import {expect} from 'vitest';

expect.extend(matchers);

Object.defineProperty(document, 'currentScript', {
  value: document.createElement('script'),
});
