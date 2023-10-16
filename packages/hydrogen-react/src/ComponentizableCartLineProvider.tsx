import {useContext, createContext, type ReactNode} from 'react';
import {
  type CartLine,
  ComponentizableCartLine,
} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

type CartLinePartialDeep = PartialDeep<
  CartLine | ComponentizableCartLine,
  {recurseIntoArrays: true}
>;

type ComponentizableCartLinePartialDeep = PartialDeep<
  ComponentizableCartLine,
  {recurseIntoArrays: true}
>;

export const ComponentizableCartLineContext =
  createContext<ComponentizableCartLinePartialDeep | null>(null);

/**
 * The `useComponentizableCartLine` hook provides access to the [ComponentizableCartLine object](https://shopify.dev/api/storefront/unstable/objects/ComponentizableCartLine) from the Storefront API. It must be a descendent of a `CartLineProvider` component.
 */
export function useComponentizableCartLine(): ComponentizableCartLinePartialDeep {
  const context = useContext(ComponentizableCartLineContext);

  if (context == null) {
    throw new Error(
      'Expected a componentizable cart line context but none was found',
    );
  }

  return context;
}

type ComponentizableCartLineProviderProps = {
  /** Any `ReactNode` elements. */
  children: ReactNode;
  /** A cart line object. */
  line: CartLinePartialDeep;
};

/**
 * The `ComponentizableCartLineProvider` component creates a context for using a componentizable cart line.
 */
export function ComponentizableCartLineProvider({
  children,
  line,
}: ComponentizableCartLineProviderProps): JSX.Element {
  const componentizableCartLine = line as ComponentizableCartLinePartialDeep;

  if ('lineComponents' in componentizableCartLine) {
    return (
      <ComponentizableCartLineContext.Provider value={componentizableCartLine}>
        {children}
      </ComponentizableCartLineContext.Provider>
    );
  }

  return <></>;
}
