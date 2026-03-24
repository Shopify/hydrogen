import {useState, useEffect} from 'react';
import {useNavigate, useLocation} from 'react-router';
import {applyFilter, removeFilter} from '~/lib/productFilters';
import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';

/**
 * A simple price-range filter with min/max inputs and an explicit Apply button.
 * The component syncs its local state from the URL so that external navigation
 * (e.g. "Clear All Filters") is reflected immediately.
 */
export function PriceRangeFilter({maxPrice}: {maxPrice?: number}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  // Keep local state in sync with URL params.
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const priceParam = searchParams.get('filter.price');

    if (priceParam) {
      try {
        const parsed = JSON.parse(priceParam) as {min?: number; max?: number};
        setMin(parsed.min?.toString() ?? '');
        setMax(parsed.max?.toString() ?? '');
      } catch {
        setMin('');
        setMax('');
      }
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
      try {
        searchParams = removeFilter(
          {price: JSON.parse(existing)} as ProductFilter,
          searchParams,
        );
      } catch {
        /* ignore */
      }
    }

    const minNum = min ? parseFloat(min) : undefined;
    const maxNum = max ? parseFloat(max) : undefined;

    if (minNum !== undefined || maxNum !== undefined) {
      const priceFilter: ProductFilter = {
        price: {
          ...(minNum !== undefined && {min: minNum}),
          ...(maxNum !== undefined && {max: maxNum}),
        },
      };
      searchParams = applyFilter(priceFilter, searchParams);
    }

    void navigate(`?${searchParams.toString()}`, {
      replace: true,
      preventScrollReset: true,
    });
  };

  const handleClear = () => {
    setMin('');
    setMax('');

    const searchParams = new URLSearchParams(location.search);
    const existing = searchParams.get('filter.price');

    if (existing) {
      try {
        const newParams = removeFilter(
          {price: JSON.parse(existing)} as ProductFilter,
          searchParams,
        );
        void navigate(`?${newParams.toString()}`, {
          replace: true,
          preventScrollReset: true,
        });
      } catch {
        /* ignore */
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
