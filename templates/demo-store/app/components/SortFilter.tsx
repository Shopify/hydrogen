import {SyntheticEvent, useMemo, Fragment, useState} from 'react';
import {Menu} from '@headlessui/react';

import {
  Heading,
  Drawer as DrawerComponent,
  IconFilters,
  IconCaret,
  IconXMark,
} from '~/components';
import {Link, useLocation, useSearchParams, Location} from '@remix-run/react';
import {useDebounce} from 'react-use';

import type {
  FilterType,
  Filter,
} from '@shopify/hydrogen-react/storefront-api-types';
import {AppliedFilter, SortParam} from '~/routes/collections/$collectionHandle';

type Props = {
  filters: Filter[];
  appliedFilters?: AppliedFilter[];
};

export function SortFilter({filters, appliedFilters = []}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => setIsOpen(true)}
          className={
            'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5'
          }
        >
          <IconFilters stroke="white" />
        </button>
        <SortMenu />
      </div>
      <FiltersDrawer
        filters={filters}
        appliedFilters={appliedFilters}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export function FiltersDrawer({
  isOpen,
  onClose,
  filters = [],
  appliedFilters = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: Filter[];
  appliedFilters: AppliedFilter[];
}) {
  const [params] = useSearchParams();
  const location = useLocation();

  const filterMarkup = (filter: Filter, option: Filter['values'][0]) => {
    switch (filter.type) {
      case 'PRICE_RANGE':
        const min =
          params.has('minPrice') && !isNaN(Number(params.get('minPrice')))
            ? Number(params.get('minPrice'))
            : undefined;

        const max =
          params.has('maxPrice') && !isNaN(Number(params.get('maxPrice')))
            ? Number(params.get('maxPrice'))
            : undefined;

        return <PriceRangeFilter min={min} max={max} />;

      default:
        const to = getFilterLink(
          filter,
          option.input as string,
          params,
          location,
        );
        return (
          <Link
            className="focus:underline hover:underline whitespace-nowrap"
            prefetch="intent"
            onClick={onClose}
            reloadDocument
            to={to}
          >
            {option.label}
          </Link>
        );
    }
  };

  return (
    <DrawerComponent
      open={isOpen}
      onClose={onClose}
      heading="Filter and sort"
      openFrom="left"
    >
      <nav className="py-8 px-8 md:px-12 ">
        {appliedFilters.length > 0 ? (
          <div className="pb-8">
            <AppliedFilters filters={appliedFilters} />
          </div>
        ) : null}
        {filters.map((filter: Filter) => (
          <div key={filter.id}>
            <Heading as="h4" size="lead" className="pb-2">
              {filter.label}
            </Heading>
            <ul key={filter.id} className="pb-8">
              {filter.values?.map((option) => {
                return <li key={option.id}>{filterMarkup(filter, option)}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>
    </DrawerComponent>
  );
}

function AppliedFilters({filters = []}: {filters: AppliedFilter[]}) {
  const [params] = useSearchParams();
  const location = useLocation();
  return (
    <>
      <Heading as="h4" size="lead" className="pb-2">
        Applied filters
      </Heading>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter: AppliedFilter) => {
          return (
            <Link
              to={getAppliedFilterLink(filter, params, location)}
              className="rounded-full border px-2 flex gap"
              key={`${filter.label}-${filter.urlParam}`}
              reloadDocument
            >
              <span className="flex-grow">{filter.label}</span>
              <span>
                <IconXMark />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function getAppliedFilterLink(
  filter: AppliedFilter,
  params: URLSearchParams,
  location: Location,
) {
  const paramsClone = new URLSearchParams(params);
  paramsClone.delete(filter.urlParam);
  return `${location.pathname}?${paramsClone.toString()}`;
}

function getSortLink(
  sort: SortParam,
  params: URLSearchParams,
  location: Location,
) {
  params.set('sort', sort);
  return `${location.pathname}?${params.toString()}`;
}

function getFilterLink(
  filter: Filter,
  rawInput: string | Record<string, any>,
  params: URLSearchParams,
  location: ReturnType<typeof useLocation>,
) {
  const paramsClone = new URLSearchParams(params);
  const newParams = filterInputToParams(filter.type, rawInput, paramsClone);
  return `${location.pathname}?${newParams.toString()}`;
}

const PRICE_RANGE_FILTER_DEBOUNCE = 500;

function PriceRangeFilter({max, min}: {max?: number; min?: number}) {
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const [minPrice, setMinPrice] = useState(min ? String(min) : '');
  const [maxPrice, setMaxPrice] = useState(max ? String(max) : '');

  useDebounce(
    () => {
      if (
        (minPrice === '' || minPrice === String(min)) &&
        (maxPrice === '' || maxPrice === String(max))
      )
        return;

      const price: {min?: string; max?: string} = {};
      if (minPrice !== '') price.min = minPrice;
      if (maxPrice !== '') price.max = maxPrice;

      const newParams = filterInputToParams('PRICE_RANGE', {price}, params);
      window.location.href = `${location.pathname}?${newParams.toString()}`;
    },
    PRICE_RANGE_FILTER_DEBOUNCE,
    [minPrice, maxPrice],
  );

  const onChangeMax = (event: SyntheticEvent) => {
    const newMaxPrice = (event.target as HTMLInputElement).value;
    setMaxPrice(newMaxPrice);
  };

  const onChangeMin = (event: SyntheticEvent) => {
    const newMinPrice = (event.target as HTMLInputElement).value;
    setMinPrice(newMinPrice);
  };

  return (
    <div className="flex">
      <label className="mb-4">
        <span>from</span>
        <input
          name="maxPrice"
          className="text-black"
          type="text"
          defaultValue={min}
          placeholder={'$'}
          onChange={onChangeMin}
        />
      </label>
      <label>
        <span>to</span>
        <input
          name="minPrice"
          className="text-black"
          type="number"
          defaultValue={max}
          placeholder={'$'}
          onChange={onChangeMax}
        />
      </label>
    </div>
  );
}

function filterInputToParams(
  type: FilterType,
  rawInput: string | Record<string, any>,
  params: URLSearchParams,
) {
  const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  switch (type) {
    case 'PRICE_RANGE':
      if (input.price.min) params.set('minPrice', input.price.min);
      if (input.price.max) params.set('maxPrice', input.price.max);
      break;
    case 'LIST':
      Object.entries(input).forEach(([key, value]) => {
        if (typeof value === 'string') {
          params.set(key, value);
        } else if (typeof value === 'boolean') {
          params.set(key, value.toString());
        } else {
          const {name, value: val} = value as {name: string; value: string};
          const newInput = {[name]: val};

          filterInputToParams(type, newInput, params);
        }
      });
      break;
  }

  return params;
}

export default function SortMenu() {
  const items: {label: string; key: SortParam}[] = [
    {
      label: 'Price: Low - High',
      key: 'price-low-high',
    },
    {
      label: 'Price: High - Low',
      key: 'price-high-low',
    },
    {
      label: 'Best Selling',
      key: 'best-selling',
    },
    {
      label: 'Newest',
      key: 'newest',
    },
  ];
  const [params] = useSearchParams();
  const location = useLocation();
  const activeItem = items.find((item) => item.key === params.get('sort'));
  const remainingItems = items.filter(
    (item) => item.key !== (activeItem || items[0]).key,
  );

  return (
    <Menu as="div" className="relative z-40">
      <Menu.Button className="flex items-center	">
        <span className="px-2">Sort by:</span>
        <span>{(activeItem || items[0]).label}</span> <IconCaret />
      </Menu.Button>

      <Menu.Items
        as="nav"
        className="bg-contrast flex flex-col absolute text-right right-0 w-48 origin-top-right focus:outline-none"
      >
        {remainingItems.map((item) => (
          <Menu.Item key={item.label}>
            {({active}) => (
              <Link
                className={`w-48 px-5 w-full block ${active ? '' : ''}`}
                to={getSortLink(item.key, params, location)}
                reloadDocument
              >
                {item.label}
              </Link>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}
