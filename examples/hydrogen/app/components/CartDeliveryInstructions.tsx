import { useState } from "react";
import type { FormEvent } from "react";

import { useCart, useCartActions } from "~/lib/cart";
import { CART_METAFIELDS_PATH } from "~/lib/cart-metafields";

// Cart metafields are server-only: the Storefront cart ajax API (Standard
// Actions) does not support them, so this form posts JSON directly to the
// app-owned /api/cart/metafields route instead of going through the optimistic
// cart store. On success it calls refresh() so the store re-reads the cart
// (with the metafield selected by the custom CartFragment in cart-handlers.ts)
// and every useCart() consumer updates. refresh() also loads the cart when none
// existed yet, so setting instructions before adding a product still shows them.
//
// To copy the instructions onto the order at checkout, the store must define a
// `custom.delivery_instructions` metafield with the cart-to-order copyable
// capability enabled:
// https://shopify.dev/docs/apps/build/metafields/use-metafield-capabilities#cart-to-order-copyable
// Without the definition, saving to the cart still works but nothing is copied
// to the order.
const DELIVERY_INSTRUCTIONS_NAMESPACE = "custom";
const DELIVERY_INSTRUCTIONS_KEY = "delivery_instructions";
const DELIVERY_INSTRUCTIONS_METAFIELD_KEY = `${DELIVERY_INSTRUCTIONS_NAMESPACE}.${DELIVERY_INSTRUCTIONS_KEY}`;
const DELIVERY_INSTRUCTIONS_METAFIELD_TYPE = "multi_line_text_field";

type CartMetafieldResponse = {
  userErrors?: Array<{ message: string }>;
  error?: { message: string };
};

type SaveState = { status: "idle" | "saving" | "saved" } | { status: "error"; message: string };

export function CartDeliveryInstructions() {
  const savedInstructions = useCart(
    (state) =>
      state.data.metafields?.find(
        (metafield) =>
          metafield?.namespace === DELIVERY_INSTRUCTIONS_NAMESPACE &&
          metafield.key === DELIVERY_INSTRUCTIONS_KEY,
      )?.value ?? "",
  );
  const { refresh } = useCartActions();
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  async function submitToCartMetafields(body: Record<string, unknown>) {
    setSaveState({ status: "saving" });
    try {
      const response = await fetch(CART_METAFIELDS_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as CartMetafieldResponse;
      const errorMessage = result.error?.message ?? result.userErrors?.[0]?.message;
      if (!response.ok || errorMessage) {
        setSaveState({ status: "error", message: errorMessage ?? "Something went wrong." });
        return;
      }
      setSaveState({ status: "saved" });
      // Re-sync the cart store so the saved metafield shows for every consumer.
      refresh();
    } catch {
      setSaveState({ status: "error", message: "Network error. Please try again." });
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const instructions = String(new FormData(event.currentTarget).get("instructions") ?? "").trim();

    // An empty value means "no instructions" — delete rather than store an empty metafield.
    if (instructions === "") {
      if (savedInstructions) void handleRemove();
      return;
    }

    void submitToCartMetafields({
      metafields: [
        {
          key: DELIVERY_INSTRUCTIONS_METAFIELD_KEY,
          type: DELIVERY_INSTRUCTIONS_METAFIELD_TYPE,
          value: instructions,
        },
      ],
    });
  }

  function handleRemove() {
    return submitToCartMetafields({ deleteMetafield: DELIVERY_INSTRUCTIONS_METAFIELD_KEY });
  }

  const isSaving = saveState.status === "saving";

  return (
    <section aria-label="Delivery instructions">
      <h5>Delivery instructions</h5>
      <form onSubmit={handleSave}>
        <textarea
          name="instructions"
          rows={3}
          defaultValue={savedInstructions}
          key={savedInstructions}
          disabled={isSaving}
          placeholder="e.g. Leave the package at the back door"
          aria-label="Delivery instructions"
        />
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save instructions"}
        </button>
        {savedInstructions ? (
          <button type="button" disabled={isSaving} onClick={() => void handleRemove()}>
            Remove instructions
          </button>
        ) : null}
      </form>
      <p role="status">
        {saveState.status === "saved" ? "Saved." : null}
        {saveState.status === "error" ? saveState.message : null}
      </p>
    </section>
  );
}
