import {useState} from 'react';
import {Heading, Drawer as DrawerComponent} from '~/components';
import {Link, useLocation} from '@remix-run/react';
import type {
  Collection,
  Filter,
} from '@shopify/hydrogen-react/storefront-api-types';

export function SortFilter({filters}: {filters: Filter[]}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end">
        <Link to="" onClick={() => setIsOpen(true)}>
          Sort and filter
        </Link>
      </div>
      <Drawer
        filterOptions={filters}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export function Drawer({
  isOpen,
  onClose,
  filterOptions = [],
  currentFilters = [],
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const location = useLocation();

  return (
    <DrawerComponent
      open={isOpen}
      onClose={onClose}
      heading="Sort and filter"
      openFrom="right"
    >
      <>
        <nav className="py-8 px-8 md:px-12 ">
          {filterOptions.map((filter: Filter) => (
            <>
              <Heading as="h4" size="lead" className="pb-2">
                {filter.label}
              </Heading>
              <ul key={filter.id} className="pb-8">
                {filter.values?.map((option) => {
                  console.log(option.input);
                  const input =
                    typeof option.input === 'string'
                      ? JSON.parse(option.input)
                      : option.input;

                  console.log(input);
                  return (
                    <li key={option.id}>
                      <Link
                        aria-selected={currentFilters.includes(filter.id)}
                        className="focus:underline hover:underline whitespace-nowrap"
                        prefetch="intent"
                        onClick={onClose}
                        reloadDocument
                        to={(() => {
                          const params = new URLSearchParams(location.search);
                          params.set('filter', JSON.stringify(option.input));
                          return location.pathname + '?' + params.toString();
                        })()}
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
