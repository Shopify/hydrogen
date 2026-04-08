import {useNavigate, useLocation} from 'react-router';
import {applySortParam, type SortOption} from '~/lib/product-sort';

export function ProductSort({
  sortOptions,
}: {
  sortOptions: Record<string, SortOption>;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const sortParam = searchParams.get('sort_by');
  const currentSort =
    sortParam && sortParam in sortOptions
      ? sortParam
      : Object.keys(sortOptions)[0];

  const handleSortChange = (sortKey: string) => {
    void navigate(`?${applySortParam(sortKey, searchParams).toString()}`, {
      replace: true,
      preventScrollReset: true,
    });
  };

  return (
    <div className="product-sort">
      <label htmlFor="sort-select">Sort by:</label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        aria-label="Sort products"
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
