import mitt from 'mitt';
import type {Emitter} from 'mitt';
import type {
  Cart,
  Customer,
  Country,
} from '@shopify/hydrogen-ui-alpha/storefront-api-types';
import type {
  PageViewProductEventPayload,
  PageViewSearchResultsPayload,
} from './useOnPage';
import type {
  AddToCartEventPayload,
  RemoveFromCartEventPayload,
  AddNoteEventPayload,
  RemoveNoteEventPayload,
  AddAttributesEventPayload,
  RemoveAttributesEventPayload,
  AddDiscountsEventPayload,
  RemovedDiscountsEventPayload,
  UpdatedBuyerIdentityEventPayload,
} from './usOnCart';

export type BaseEvent = {
  type: keyof EventTypes;
  id: string;
  time: string;
};

export type EventDataCountry = {
  isoCode: Country['isoCode'];
  name: Country['name'];
  currency: {
    isoCode: Country['currency']['isoCode'];
    symbol: Country['currency']['symbol'];
  };
};

type EventDataPage = {
  url: Location;
  title: string;
  description: string;
};

export type BaseEventPayloadData = {
  customer: Customer | null;
  cart: Cart | null;
  prevCart?: Cart | null;
  country: EventDataCountry;
};

export interface BaseEventPayload {
  event: BaseEvent;
  page: EventDataPage;
  data: BaseEventPayloadData;
}

export type AllowedEventPayloads =
  | BaseEventPayload
  | PageViewProductEventPayload
  | AddToCartEventPayload
  | RemoveFromCartEventPayload
  | AddNoteEventPayload
  | AddAttributesEventPayload
  | RemoveAttributesEventPayload
  | AddDiscountsEventPayload
  | RemovedDiscountsEventPayload
  | UpdatedBuyerIdentityEventPayload;

export type EventTypes = {
  // page
  page_view: BaseEventPayload;
  page_view_cart: BaseEventPayload;
  page_view_product: PageViewProductEventPayload;
  page_view_search_results: PageViewSearchResultsPayload;
  // customer
  login: BaseEventPayload;
  register: BaseEventPayload;
  // cart
  create_cart: BaseEventPayload;
  update_cart: BaseEventPayload;
  add_to_cart: AddToCartEventPayload;
  remove_from_cart: RemoveFromCartEventPayload;
  add_note_to_cart: AddNoteEventPayload;
  remove_note_from_cart: RemoveNoteEventPayload;
  add_attribute_to_cart: AddAttributesEventPayload;
  remove_attribute_from_cart: RemoveAttributesEventPayload;
  add_discount_to_cart: AddDiscountsEventPayload;
  remove_discount_from_cart: RemovedDiscountsEventPayload;
  update_cart_buyer_identity: UpdatedBuyerIdentityEventPayload;
};

export type CustomEventTypes = {
  [key: string]: any;
};

// typed hydrogen events
const events: Emitter<EventTypes> = mitt<EventTypes>();
// user-defined events
const customEvents: Emitter<CustomEventTypes> = mitt<CustomEventTypes>();

class PubSubEvent {
  userId: string;

  constructor() {
    this.userId = crypto.randomUUID();
  }

  getUserId() {
    return this.userId;
  }

  publish(type: string, payload?: object) {
    customEvents.emit(type, payload);
    customEvents.emit('*', {type, payload});
  }

  subscribe(type: string, callback: (payload: any) => void) {
    customEvents.on(type, callback);
  }

  unsubscribe(type: string, callback: (payload: any) => void) {
    customEvents.off(type, callback);
  }
}

export const HydrogenEvent = new PubSubEvent();
export default events;
