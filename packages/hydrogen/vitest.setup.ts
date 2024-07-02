import matchers from '@testing-library/jest-dom/matchers';

import {expect} from 'vitest';

expect.extend(matchers);

const perfkit = document.createElement('script');
perfkit.setAttribute('data-application', 'hydrogen');
perfkit.setAttribute('data-shop-id', '1');
perfkit.setAttribute('data-storefront-id', '0');
perfkit.setAttribute('data-monorail-region', 'global');
perfkit.setAttribute('data-spa-mode', 'true');

Object.defineProperty(document, 'currentScript', {
  value: perfkit,
});
