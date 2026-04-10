import {useLocation} from 'react-router';
import {
  applyFilter,
  removeFilter,
  parseFilterInput,
  isFilterActive,
  useFilterNavigation,
} from '~/lib/product-filters';
import {PriceRangeFilter} from './PriceRangeFilter';
import type {CollectionQuery} from 'storefrontapi.generated';

type Filter = NonNullable<
  CollectionQuery['collection']
>['products']['filters'][number];

export function ProductFilters({filters}: {filters: Filter[]}) {
  const navigateFilters = useFilterNavigation();
  const location = useLocation();

  if (!filters || filters.length === 0) return null;

  const toggleFilter = (filterInput: string) => {
    const searchParams = new URLSearchParams(location.search);
    const filter = parseFilterInput(filterInput);
    if (!filter) return;

    const updated = isFilterActive(filterInput, searchParams)
      ? removeFilter(filter, searchParams)
      : applyFilter(filter, searchParams);

    navigateFilters(updated);
  };

  const clearAllFilters = () => {
    const searchParams = new URLSearchParams(location.search);

    for (const key of [...searchParams.keys()]) {
      if (key.startsWith('filter.')) searchParams.delete(key);
    }

    searchParams.delete('cursor');
    searchParams.delete('direction');

    navigateFilters(searchParams);
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
            const parsed = parseFilterInput(String(value.input));
            if (parsed?.price?.max !== undefined) maxPrice = parsed.price.max;
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
                const searchParams = new URLSearchParams(location.search);
                const isApplied = isFilterActive(inputString, searchParams);
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
