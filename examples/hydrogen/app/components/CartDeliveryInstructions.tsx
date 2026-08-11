import { useState } from "react";
import type { FormEvent } from "react";

import { useCart } from "~/lib/cart";

// Cart metafields are server-only: the Storefront cart ajax API (Standard
// Actions) does not support them, so this form bypasses the optimistic cart
// store and posts JSON directly to /api/cart. The POST response includes the
// refetched cart (extended with the metafield via the custom CartFragment in
// app/lib/cart-handlers.ts), which this component keeps in local state — the
// cart store itself is not updated, so its copy of the metafields stays stale
// until its next natural revalidation. Each mounted instance (cart page and
// cart aside) tracks its own saves.
//
// To copy the instructions onto the order at checkout, the store must define
// a `custom.delivery_instructions` metafield with the cart-to-order copyable
// capability enabled:
// https://shopify.dev/docs/apps/build/metafields/use-metafield-capabilities#cart-to-order-copyable
// Without the definition, saving to the cart still works but nothing is
// copied to the order.
const CART_ENDPOINT = "/api/cart";
const DELIVERY_INSTRUCTIONS_NAMESPACE = "custom";
const DELIVERY_INSTRUCTIONS_KEY = "delivery_instructions";
const DELIVERY_INSTRUCTIONS_METAFIELD_KEY = `${DELIVERY_INSTRUCTIONS_NAMESPACE}.${DELIVERY_INSTRUCTIONS_KEY}`;
const DELIVERY_INSTRUCTIONS_METAFIELD_TYPE = "multi_line_text_field";

type CartMetafields = Array<{ namespace: string; key: string; value: string } | null> | null;

type CartApiResponse = {
  cart?: { metafields?: CartMetafields } | null;
  userErrors?: Array<{ message: string }>;
  error?: { message: string };
};

type SaveState = { status: "idle" | "saving" | "saved" } | { status: "error"; message: string };

function findDeliveryInstructions(metafields: CartMetafields | undefined): string {
  return (
    metafields?.find(
      (metafield) =>
        metafield?.namespace === DELIVERY_INSTRUCTIONS_NAMESPACE &&
        metafield.key === DELIVERY_INSTRUCTIONS_KEY,
    )?.value ?? ""
  );
}

export function CartDeliveryInstructions() {
  const storeMetafields = useCart((cart) => cart.data.metafields);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  // Local override of the cart store's metafields after a save/remove; null
  // means "no save happened yet, use the store's data".
  const [localMetafields, setLocalMetafields] = useState<CartMetafields>(null);

  const savedInstructions = findDeliveryInstructions(localMetafields ?? storeMetafields);

  async function submitToCartApi(body: Record<string, unknown>) {
    setSaveState({ status: "saving" });
    try {
      const response = await fetch(CART_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as CartApiResponse;
      const errorMessage = result.error?.message ?? result.userErrors?.[0]?.message;
      if (!response.ok || errorMessage) {
        setSaveState({ status: "error", message: errorMessage ?? "Something went wrong." });
        return;
      }
      setLocalMetafields(result.cart?.metafields ?? []);
      setSaveState({ status: "saved" });
    } catch {
      setSaveState({ status: "error", message: "Network error. Please try again." });
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const instructions = String(new FormData(event.currentTarget).get("instructions") ?? "");

    // Saving an empty value means "no instructions" — delete instead of
    // storing an empty metafield.
    if (instructions.trim() === "") {
      if (savedInstructions) void handleRemove();
      return;
    }

    void submitToCartApi({
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
    return submitToCartApi({ deleteMetafield: DELIVERY_INSTRUCTIONS_METAFIELD_KEY });
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
