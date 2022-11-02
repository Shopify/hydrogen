# Client-side Hydrogen Events API

## Event listeners

Hydrogen events listeners are split in four groups:
- `useOnPage` — Navigation events
- `useOnCustomer` — Customer events
- `useOnCart` — Cart events
- `useOnEvent` — Custom events

```js
  import {useOnPage, useOnCart, useOnEvent, useOnCustomer} from '@hydrogen-events';
```

### Navigation events — useOnPage
This hooks is used to listen to events associated with initial page load and subsequent navigation. The following navigation events are available:

```ts
import {useOnPage} from '@hydrogen-events';

export function GTMPage() {
  useOnPage({
    view(payload: BaseEventPayload) {
      /*
        Runs on initial page load and after every route change
        window.dataLayer.push('page_view', ....)
      */
    },
    viewProduct(payload: PageViewProductEventPayload) {
      /*
        Runs on every product detail route visit
        requires handle { isProductRoute: true } because we chose not to hardcode the logic to a /products pattern match due to Int.
        window.dataLayer.push('view_item', ....)
      */
    },
    viewCart(payload: BaseEventPayload) {
      /*
        Runs on every cart route visit
        Requires handle { isCartRoute: true } because we chose not to hardcode the logic to a /cart pattern match due to Int.
        Note: please see custom events for a sde cart view example
        window.dataLayer.push('view_cart', ....)
      */
    },
    viewSearch(payload: PageViewSearchResultsPayload) {
      /*
        Runs on every search route visit
        Requires handle { isSearchRoute: true } because we chose not to hardcode the logic to a /search pattern match due to Int.
        window.dataLayer.push('view_search_results', ....)
      */
    },
  });
}
```

### Cart events — useOnCart
Events associated with the `cart`.

```ts
import {useOnCart} from '@hydrogen-events';

export function GTMCart() {
  useOnCart({
    create: (payload: BaseEventPayload) {
      // Runs when a new cart is created
    },
    update: (payload: BaseEventPayload) {
      // Runs after every cart update
    },
    addLines: (payload: AddToCartEventPayload) {
      // Runs after each successful add to cart event
      // window.dataLayer('add_to_cart', ...) (add)
    },
    removeLines: (payload: RemoveFromCartEventPayload) {
      // Runs after each successful remove from cart event
      // window.dataLayer('add_to_cart', ...) (remove)
    },
    addDiscounts: (payload: AddDiscountsEventPayload) {
      // Runs after cart.discount(s) are added
    },
    removeDiscounts: (payload: RemovedDiscountsEventPayload) {
      // Runs after cart.discount(s) are removed
    },
    addNote: (payload: AddNoteEventPayload) {
      // Runs after cart.note is added
    },
    removeNote: (payload: RemoveNoteEventPayload) {
      // Runs after a cart.note is removed
    },
    addAttributes: (payload: AddAttributesEventPayload) {
      // Runs after cart.attribute(s) are added
    },
    removeAttributes: (payload: RemoveAttributesEventPayload) {
      // Runs after cart.attribute(s) are removed
    },
    updateBuyerIdentity: (payload: UpdatedBuyerIdentityEventPayload) {
      // Runs after cart.buyerAttributes are removed
    }
  });
}
```

### Customer events — useOnCustomer
Events associated with the `customer`.

```ts
import {useOnCustomer} from '@hydrogen-events';

export function GTMCustomer() {
  useOnCustomer({
    login: (payload: CustomerLoginEventPayload) {
      // Runs after each successful user login
      // window.dataLayer('login', ...)
    },
    register: (payload: CustomerRegisterEventPayload) {
      // Runs after each successful user registration
      // window.dataLayer('register', ...)
    },
  });
}
```


## Emitting custom events

Emitted custom events will be automatically available via `useOnEvent`:

```js filename: /components/ToggleCart.tsx
  import {HydrogenEvent} from '@hydrogen-events';

  function ToggleCart() {
    const [cart, setCart] = useState(false);
    return (
      <button
        onClick={() => {
          if (!cart) {
            // publish the custom event `viewSideCart`
            HydrogenEvent.publish('viewSideCart', { foo: 'bar', open: true })
            setCart(true)
          } else {
            setCart(false)
          }
        }}
      >
        View Cart
      </button>
    )
  }
```

## Listening for custom events — useOnEvent
User-emitted events. Please see [emitting]() custom events section.

```ts
import {useOnEvent} from '@hydrogen-events';

export function GTMCustom() {
  useOnEvent({
    viewSideCart(payload: BaseEventPayload | unknown) {
      /*
        Runs when the cart drawer is toggled
        This example event was published via HydrogenEvent.publish('viewSideCart', ...);
        window.dataLayer.push('view_cart', ....)
      */
    },
    //...
  });
}
```

### Page Events
  `page_view`: visited page or route BaseEventPayload;
  `page_view_cart`: BaseEventPayload;
  `page_view_product`: PageViewProductEventPayload;
  `page_view_search_results`: PageViewSearchResultsPayload;

### Customer Events
  `login`: BaseEventPayload;
  `register`: BaseEventPayload;

## Cart Events
  `create_cart`: BaseEventPayload;
  `update_cart`: BaseEventPayload;
  `add_to_car`: AddToCartEventPayload;
  `remove_from_cart`: RemoveFromCartEventPayload;
  `add_note_to_cart`: AddNoteEventPayload;
  `remove_note_from_cart`: RemoveNoteEventPayload;
  `add_attribute_to_cart`: AddAttributesEventPayload;
  `remove_attribute_from_cart`: RemoveAttributesEventPayload;
  `add_discount_to_cart`: AddDiscountsEventPayload;
  `remove_discount_from_cart`: RemovedDiscountsEventPayload;
  `update_cart_buyer_identity`: UpdatedBuyerIdentityEventPayload;


## Typescript types
Event payload TS helpers:

```js
import type {
  AddAttributesEventPayload,
  AddDiscountsEventPayload,
  AddNoteEventPayload,
  AddToCartEventPayload,
  BaseEventPayload
  PageViewProductEventPayload,
  PageViewSearchResultsPayload,
  RemoveAttributesEventPayload,
  RemovedDiscountsEventPayload,
  RemoveFromCartEventPayload,
  RemoveNoteEventPayload,
  UpdatedBuyerIdentityEventPayload,
} from '@hydrogen-events';
```

### Example types - useOnPage
```ts
type BaseEvent = {
  type: keyof EventTypes;
  id: string;
  time: string;
};

type EventDataPage = {
  url: Location;
  title: string;
  description: string;
};

type BaseEventPayloadData = {
  customer: Customer | null;
  cart: Cart | null;
  prevCart?: Cart | null;
  country: EventDataCountry;
};

interface BaseEventPayload {
  event: BaseEvent;
  page: EventDataPage;
  data: BaseEventPayloadData;
}

interface PageViewProductEventPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    product: Product;
  };
}

interface PageViewSearchResultsPayload extends BaseEventPayload {
  data: BaseEventPayloadData & {
    searchResults: Product[] | [];
    searchTerm: string;
  };
}
```

## GTM Events
- `page_view`: visited page or route
- `view_item`: View product details
- `view_item_list`: View of product impressions in a list or collection
- `select_item`: Click on a product or variant
- `view_cart`: View shopping cart / toggled cart
- `begin_checkout`: Initiate the checkout process
- `add_to_cart`: Add product to cart
- `applied_discount`: User applied a discount to the cart
- `remove_from_cart`: Remove product from the cart
- `login`: user authenticated
- `register`: user registered
- `view_search_results`: viewed search results

### Other GTM events (out of scope)
- `newsletter_subscribe`: subscribed to the news letter
- `view_promotion`: When a user views a promotion
- `select_promotion`: When a user clicks on a promotion
- `add_to_wishlist`: added product to a wishlist
