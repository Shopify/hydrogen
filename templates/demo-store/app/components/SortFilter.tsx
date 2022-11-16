import {useState} from 'react';
import {Heading, Button, Drawer as DrawerComponent} from '~/components';
import {Link, useLocation} from '@remix-run/react';
import type {
  FilterType,
  Filter,
} from '@shopify/hydrogen-react/storefront-api-types';

type Props = {
  filters: Filter[];
};

export function SortFilter({filters}: {filters: Filter[]}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end">
        <Button variant="secondary" onClick={() => setIsOpen(true)}>
          Filter and sort
        </Button>
      </div>
      <Drawer
        filters={filters}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export function Drawer({
  isOpen,
  onClose,
  filters = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: Filter[];
}) {
  const location = useLocation();

  return (
    <DrawerComponent
      open={isOpen}
      onClose={onClose}
      heading="Filter and sort"
      openFrom="right"
    >
      <>
        <nav className="py-8 px-8 md:px-12 ">
          {filters.map((filter: Filter) => (
            <>
              <Heading as="h4" size="lead" className="pb-2">
                {filter.label}
              </Heading>
              <ul key={filter.id} className="pb-8">
                {filter.values?.map((option) => {
                  const params = new URLSearchParams(location.search);

                  const newParams = filterInputToParams(
                    filter.type,
                    option.input as string,
                    params,
                  );

                  const to = `${location.pathname}?${newParams.toString()}`;
                  return (
                    <li key={option.id}>
                      <Link
                        className="focus:underline hover:underline whitespace-nowrap"
                        prefetch="intent"
                        onClick={onClose}
                        reloadDocument
                        to={to}
                      >
                        {option.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ))}
        </nav>
      </>
    </DrawerComponent>
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
      params.set('minPrice', input.min);
      params.set('maxPrice', input.max);
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
