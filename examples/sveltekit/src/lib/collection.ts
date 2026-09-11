import {
  createCollectionStore,
  type CollectionData,
  type CollectionState,
  type CollectionStore,
} from "@shopify/hydrogen";
import { readable, type Readable } from "svelte/store";

type CollectionStoreController = {
  store: CollectionStore;
  subscribe: (listener: (store: CollectionStore) => void) => () => void;
  reset: (options: {
    data: CollectionData;
    urlSearch: string;
    onChange: (searchString: string) => void;
  }) => void;
};

export function createCollectionStoreController(options: {
  data: CollectionData;
  urlSearch: string;
  onChange: (searchString: string) => void;
}): CollectionStoreController {
  let listeners: Array<(store: CollectionStore) => void> = [];
  let onChange = options.onChange;
  let store = createStore(options.data, options.urlSearch);

  function createStore(data: CollectionData, urlSearch: string) {
    const nextStore = createCollectionStore({ data, urlSearch });
    nextStore.setOnBrowseChange(() => {
      const params = nextStore.serializeToParams();
      const search = params.toString();
      onChange(search ? `?${search}` : "");
    });
    return nextStore;
  }

  return {
    get store() {
      return store;
    },
    subscribe(listener) {
      listeners = [...listeners, listener];
      listener(store);
      return () => {
        listeners = listeners.filter((item) => item !== listener);
      };
    },
    reset(nextOptions) {
      onChange = nextOptions.onChange;
      store.setOnBrowseChange(null);
      store = createStore(nextOptions.data, nextOptions.urlSearch);
      for (const listener of listeners) listener(store);
    },
  };
}

export function collectionState(controller: CollectionStoreController): Readable<CollectionState> {
  return readable(controller.store.getState(), (set) => {
    let unsubscribeStore: (() => void) | undefined;
    const unsubscribeController = controller.subscribe((store) => {
      unsubscribeStore?.();
      set(store.getState());
      unsubscribeStore = store.subscribe(set);
    });

    return () => {
      unsubscribeStore?.();
      unsubscribeController();
    };
  });
}

export function createCollectionForm(controller: CollectionStoreController) {
  return {
    formProps(opts?: {
      beforeSubmit?: (event: Event) => void;
      afterSubmit?: (event: Event) => void;
    }) {
      return {
        onsubmit: (event: SubmitEvent) => {
          opts?.beforeSubmit?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          controller.store.handleFormSubmit(event);
          opts?.afterSubmit?.(event);
        },
      };
    },
  };
}
