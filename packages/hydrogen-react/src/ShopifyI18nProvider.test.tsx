import {describe, expect, it} from 'vitest';

import {render, screen, renderHook} from '@testing-library/react';
import {useShop} from './ShopifyProvider.js';
import {ShopifyI18nProvider} from './ShopifyI18nProvider.js';

describe('<ShopifyI18nProvider/>', () => {
  it('renders its children', () => {
    render(
      <ShopifyI18nProvider countryIsoCode={'US'} languageIsoCode={'EN'}>
        <div>child</div>;
      </ShopifyI18nProvider>,
    );

    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('returns the hydrogen context values', () => {
    const {result} = renderHook(() => useShop(), {
      wrapper: ({children}) => (
        <ShopifyI18nProvider countryIsoCode={'CA'} languageIsoCode={'FR'}>
          {children}
        </ShopifyI18nProvider>
      ),
    });

    expect(result.current.countryIsoCode).toBe('CA');
    expect(result.current.languageIsoCode).toBe('FR');
  });
});
