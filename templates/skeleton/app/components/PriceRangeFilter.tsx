import {useState, useEffect} from 'react';
import {useLocation} from 'react-router';
import {
  applyFilter,
  removeFilter,
  parsePriceParam,
} from '~/lib/product-filters';
import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';
import {useFilterNavigation} from '~/lib/product-filters';

/**
 * A simple price-range filter with min/max inputs and an explicit Apply button.
 * The component syncs its local state from the URL so that external navigation
 * (e.g. "Clear All Filters") is reflected immediately.
 */
export function PriceRangeFilter({maxPrice}: {maxPrice?: number}) {
  const navigateFilters = useFilterNavigation();
  const location = useLocation();

  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  // Keep local state in sync with URL params.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const priceParam = searchParams.get('filter.price');

    if (priceParam) {
      const parsed = parsePriceParam(priceParam);
      setMin(parsed?.min?.toString() ?? '');
      setMax(parsed?.max?.toString() ?? '');
    } else {
      setMin('');
      setMax('');
    }
  }, [location.search]);

  const handleApply = () => {
    let searchParams = new URLSearchParams(location.search);

    // Remove existing price filter first.
    const existing = searchParams.get('filter.price');
    if (existing) {
      const priceValue = parsePriceParam(existing);
      if (priceValue) {
        searchParams = removeFilter({price: priceValue}, searchParams);
      }
    }

    const minNum = min ? Math.max(0, parseFloat(min)) : undefined;
    const maxNum = max ? Math.max(0, parseFloat(max)) : undefined;

    // Ignore invalid input (NaN, Infinity)
    const validMin =
      minNum !== undefined && Number.isFinite(minNum) ? minNum : undefined;
    const validMax =
      maxNum !== undefined && Number.isFinite(maxNum) ? maxNum : undefined;

    if (validMin !== undefined || validMax !== undefined) {
      const priceFilter: ProductFilter = {
        price: {
          ...(validMin !== undefined && {min: validMin}),
          ...(validMax !== undefined && {max: validMax}),
        },
      };
      searchParams = applyFilter(priceFilter, searchParams);
    }

    navigateFilters(searchParams);
  };

  const handleClear = () => {
    setMin('');
    setMax('');

    const searchParams = new URLSearchParams(location.search);
    const existing = searchParams.get('filter.price');

    if (existing) {
      const priceValue = parsePriceParam(existing);
      if (priceValue) {
        const newParams = removeFilter({price: priceValue}, searchParams);
        navigateFilters(newParams);
      }
    }
  };

  const hasValue = min || max;

  return (
    <div className="price-range-filter" data-max={maxPrice}>
      <div className="price-inputs">
        <input
          type="number"
          placeholder="Min"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          min="0"
          step="0.01"
          aria-label="Minimum price"
        />
        <span className="price-separator">to</span>
        <input
          type="number"
          placeholder="Max"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          min="0"
          step="0.01"
          aria-label="Maximum price"
        />
      </div>
      <div className="price-actions">
        <button
          type="button"
          onClick={handleApply}
          aria-label="Apply price filter"
        >
          Apply
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear price filter"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
