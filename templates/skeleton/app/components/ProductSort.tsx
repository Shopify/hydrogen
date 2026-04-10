import {useId} from 'react';
import {useLocation} from 'react-router';
import {applySortParam, type SortOption} from '~/lib/product-sort';
import {useFilterNavigation} from '~/lib/product-filters';

export function ProductSort({
  sortOptions,
}: {
  sortOptions: Record<string, SortOption>;
}) {
  const navigateFilters = useFilterNavigation();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const sortParam = searchParams.get('sort_by');
  const currentSort =
    sortParam && sortParam in sortOptions
      ? sortParam
      : Object.keys(sortOptions)[0];

  const sortId = useId();

  const handleSortChange = (sortKey: string) => {
    navigateFilters(applySortParam(sortKey, searchParams));
  };

  return (
    <div className="product-sort">
      <label htmlFor={sortId}>Sort by:</label>
      <select
        id={sortId}
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
      >
        {Object.entries(sortOptions).map(([key, option]) => (
          <option key={key} value={key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
