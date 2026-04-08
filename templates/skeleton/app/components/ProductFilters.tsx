import {useNavigate, useLocation} from 'react-router';
import {applyFilter, removeFilter} from '~/lib/product-filters';
import type {ProductFilter} from '@shopify/hydrogen/storefront-api-types';
import {PriceRangeFilter} from './PriceRangeFilter';
import type {CollectionQuery} from 'storefrontapi.generated';

type Filter = NonNullable<
  CollectionQuery['collection']
>['products']['filters'][number];

export function ProductFilters({filters}: {filters: Filter[]}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!filters || filters.length === 0) return null;

  const toggleFilter = (filterInput: string) => {
    const searchParams = new URLSearchParams(location.search);

    try {
      const filter = JSON.parse(filterInput) as ProductFilter;
      const [[filterKey, filterValue]] = Object.entries(filter);
      const paramKey = `filter.${filterKey}`;
      const paramValue = JSON.stringify(filterValue);

      if (searchParams.getAll(paramKey).includes(paramValue)) {
        void navigate(`?${removeFilter(filter, searchParams).toString()}`, {
          replace: true,
          preventScrollReset: true,
        });
      } else {
        void navigate(`?${applyFilter(filter, searchParams).toString()}`, {
          replace: true,
          preventScrollReset: true,
        });
      }
    } catch (error) {
      console.error('Failed to toggle filter:', error);
    }
  };

  const isFilterApplied = (filterInput: string): boolean => {
    const searchParams = new URLSearchParams(location.search);

    try {
      const filter = JSON.parse(filterInput) as ProductFilter;
      const [[filterKey, filterValue]] = Object.entries(filter);
      return searchParams
        .getAll(`filter.${filterKey}`)
        .includes(JSON.stringify(filterValue));
    } catch {
      return false;
    }
  };

  const clearAllFilters = () => {
    const searchParams = new URLSearchParams(location.search);

    for (const key of [...searchParams.keys()]) {
      if (key.startsWith('filter.')) searchParams.delete(key);
    }

    searchParams.delete('cursor');
    searchParams.delete('direction');

    void navigate(`?${searchParams.toString()}`, {
      replace: true,
      preventScrollReset: true,
    });
  };

  const hasActiveFilters = [
    ...new URLSearchParams(location.search).keys(),
  ].some((k) => k.startsWith('filter.'));

  return (
    <div className="product-filters">
      {hasActiveFilters && (
        <button
          type="button"
          className="product-filters-clear"
          onClick={clearAllFilters}
        >
          Clear All Filters
        </button>
      )}
      {filters.map((filter) => {
        if (filter.type === 'PRICE_RANGE') {
          let maxPrice: number | undefined;
          for (const value of filter.values) {
            try {
              const parsed = JSON.parse(String(value.input)) as {
                price?: {max?: number};
              };
              if (parsed.price?.max !== undefined) maxPrice = parsed.price.max;
            } catch {
              /* ignore */
            }
          }

          return (
            <div key={filter.id} className="product-filter-group">
              <h3>{filter.label}</h3>
              <PriceRangeFilter maxPrice={maxPrice} />
            </div>
          );
        }

        if (filter.type !== 'LIST') return null;

        const hasSwatches = filter.values.some(
          (v) => v.swatch?.color || v.swatch?.image,
        );

        return (
          <div key={filter.id} className="product-filter-group">
            <h3>{filter.label}</h3>
            <div className="product-filter-options">
              {filter.values.map((value) => {
                const inputString = String(value.input);
                const isApplied = isFilterApplied(inputString);
                const swatch = value.swatch;

                return (
                  <button
                    key={value.id}
                    type="button"
                    className={`product-filter-option${hasSwatches ? ' has-swatch' : ''}`}
                    onClick={() => toggleFilter(inputString)}
                    style={{
                      border: isApplied ? '2px solid black' : '1px solid #ccc',
                    }}
                    title={`${value.label} (${value.count})`}
                    aria-label={`${value.label}, ${value.count} products`}
                    aria-pressed={isApplied}
                  >
                    {hasSwatches && swatch ? (
                      <>
                        {swatch.image?.previewImage?.url ? (
                          <img
                            src={swatch.image.previewImage.url}
                            alt={value.label}
                            className="swatch-image"
                          />
                        ) : swatch.color ? (
                          <div
                            aria-label={value.label}
                            className="swatch-color"
                            style={{backgroundColor: swatch.color}}
                          />
                        ) : (
                          <span>{value.label}</span>
                        )}
                      </>
                    ) : (
                      <>
                        {value.label} ({value.count})
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
