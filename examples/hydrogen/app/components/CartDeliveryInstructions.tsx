import { useId, useState } from "react";
import type { FormEvent } from "react";

import { useCart, useCartActions } from "~/lib/cart";
import { CART_METAFIELDS_PATH } from "~/lib/cart-metafields-path";

// Cart metafields are server-only: the Storefront cart ajax API (Standard
// Actions) does not support them, so this form posts JSON directly to the
// app-owned /api/cart/metafields route instead of going through the optimistic
// cart store. On success it calls refresh() so the store re-reads the cart
// (with the metafield selected by the custom CartFragment in cart-handlers.ts)
// and every useCart() consumer updates. The route only mutates an existing cart,
// and this form renders inside the cart summary (after items are added), so a
// cart is always present when saving.
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

// Bound the save request so a hung connection can't leave the form stuck on
// "Saving…". On timeout the fetch rejects with a TimeoutError, which the catch
// below turns into a recoverable error state.
const SAVE_REQUEST_TIMEOUT_IN_MILLISECONDS = 10_000;

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
  const headingId = useId();
  const instructionsId = useId();
  const errorId = useId();

  async function submitToCartMetafields(body: Record<string, unknown>) {
    setSaveState({ status: "saving" });
    try {
      const response = await fetch(CART_METAFIELDS_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SAVE_REQUEST_TIMEOUT_IN_MILLISECONDS),
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
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      setSaveState({
        status: "error",
        message: timedOut ? "Timed out. Please try again." : "Network error. Please try again.",
      });
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
  const errorMessage = saveState.status === "error" ? saveState.message : null;

  return (
    <section aria-labelledby={headingId}>
      <h5 id={headingId}>Delivery instructions</h5>
      <form onSubmit={handleSave}>
        <label htmlFor={instructionsId}>Delivery instructions</label>
        <textarea
          id={instructionsId}
          name="instructions"
          rows={3}
          defaultValue={savedInstructions}
          key={savedInstructions}
          disabled={isSaving}
          placeholder="e.g. Leave the package at the back door"
          aria-invalid={errorMessage ? true : undefined}
          aria-describedby={errorMessage ? errorId : undefined}
        />
        {errorMessage ? (
          <p id={errorId} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save instructions"}
        </button>
        {savedInstructions ? (
          <button type="button" disabled={isSaving} onClick={() => void handleRemove()}>
            Remove instructions
          </button>
        ) : null}
      </form>
      <p role="status">{saveState.status === "saved" ? "Saved." : null}</p>
    </section>
  );
}
