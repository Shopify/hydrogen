import type { Page } from "playwright-core";
import { z } from "zod";

import { untilAborted } from "../async.ts";

/** How long the command waits for a product form variant field after the page is observable. */
export const VARIANT_FIELD_TIMEOUT_MS = 10_000;
const POLL_MS = 100;
const MAX_FIELDS = 50;
const MAX_VALUE = 200;
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/[1-9]\d*$/;
const NUMERIC_ID = /^[1-9]\d*$/;

/**
 * One variant field of a visible product form. `merchandiseId` is the Hydrogen field
 * (`register("merchandiseId")`), which holds a ProductVariant GID. `id` is the Liquid field
 * (`input` or `select` named `id` in a form that posts to `/cart/add`), which holds a numeric ID.
 */
export type VariantField = { name: "merchandiseId" | "id"; value: string };

export type SelectedVariant =
  | { status: "selected"; variantId: string }
  | { status: "unknown"; reason: string };

/**
 * Runs in the page. Returns the current `value` (not the `value` attribute) of each recognized
 * variant field in a visible form, or `null` when there is none yet:
 *
 * - `input[name="merchandiseId"]` in a form.
 * - `input` or `select` named `id` that a form owns (in it or tied with `form="…"`), when the
 *   form's `action` path ends with `/cart/add`, for example `/cart/add` or `/fr/cart/add`.
 *
 * A form is visible when it and its ancestors are not `display: none` or `visibility: hidden`.
 */
export function readVariantFields({
  maxFields,
  maxValue,
}: {
  maxFields: number;
  maxValue: number;
}): VariantField[] | null {
  const fields: VariantField[] = [];
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- waitForFunction sends only this function to the page.
  const visible = (form: HTMLFormElement | null): boolean =>
    form?.checkVisibility({ checkVisibilityCSS: true }) === true;
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- waitForFunction sends only this function to the page.
  const postsToCartAdd = (form: HTMLFormElement): boolean => {
    try {
      // The attribute: a form control named `action` would replace `form.action`.
      const action = form.getAttribute("action") ?? "";
      return new URL(action, document.baseURI).pathname.endsWith("/cart/add");
    } catch {
      return false;
    }
  };
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="merchandiseId"]')) {
    if (!visible(input.form)) continue;
    fields.push({ name: "merchandiseId", value: input.value.slice(0, maxValue) });
  }
  for (const form of document.querySelectorAll("form")) {
    if (!postsToCartAdd(form) || !visible(form)) continue;
    // The controls that the form owns, also through `form="…"`. Through the prototype getter: a
    // control named `elements` would replace `form.elements`.
    const elements: unknown = Reflect.get(HTMLFormElement.prototype, "elements", form);
    if (!(elements instanceof HTMLFormControlsCollection)) continue;
    for (const control of elements) {
      const isField = control instanceof HTMLInputElement || control instanceof HTMLSelectElement;
      if (!isField || control.name !== "id") continue;
      fields.push({ name: "id", value: control.value.slice(0, maxValue) });
    }
  }
  // One field more than the limit, so that Node rejects the list instead of reading part of it.
  return fields.length === 0 ? null : fields.slice(0, maxFields + 1);
}

const fieldsSchema = z
  .array(z.object({ name: z.enum(["merchandiseId", "id"]), value: z.string().max(MAX_VALUE) }))
  .min(1)
  .max(MAX_FIELDS);

/**
 * Waits until the page has a recognized variant field (see `readVariantFields`), up to
 * {@link VARIANT_FIELD_TIMEOUT_MS}, then decides which variant of the product it selects. The
 * interrupt throws. Every other problem gives `unknown`.
 */
export async function observeSelectedVariant(
  page: Page,
  variantIds: readonly string[],
  interrupt: AbortSignal,
): Promise<SelectedVariant> {
  let raw: unknown;
  try {
    const handle = await untilAborted(
      page.waitForFunction(
        readVariantFields,
        { maxFields: MAX_FIELDS, maxValue: MAX_VALUE },
        // An interval: animation frames can stall in a headless page that is not in front.
        { polling: POLL_MS, timeout: VARIANT_FIELD_TIMEOUT_MS },
      ),
      interrupt,
    );
    raw = await untilAborted(handle.jsonValue(), interrupt);
    await handle.dispose();
  } catch {
    interrupt.throwIfAborted();
    return unknown(`No product form variant field was found in ${VARIANT_FIELD_TIMEOUT_MS} ms.`);
  }
  const fields = fieldsSchema.safeParse(raw);
  if (!fields.success) {
    return unknown(
      `The page has more than ${MAX_FIELDS} product form variant fields, or invalid ones.`,
    );
  }
  return selectedVariant(fields.data, variantIds);
}

/**
 * The variant that the fields select. Each value must be a variant ID: a ProductVariant GID in
 * `merchandiseId`, a numeric ID in `id`. IDs that are not in `variantIds` (the product's
 * examined variants) belong to other products, such as recommended products, and are ignored.
 * The other IDs must all be the same.
 */
export function selectedVariant(
  fields: readonly VariantField[],
  variantIds: readonly string[],
): SelectedVariant {
  const ids = new Set<string>();
  for (const field of fields) {
    const id = variantGid(field);
    if (id === undefined) {
      return unknown(
        `A product form ${field.name} field holds ${JSON.stringify(field.value)}, which is not a variant ID.`,
      );
    }
    if (variantIds.includes(id)) ids.add(id);
  }
  const [id, ...others] = ids;
  if (id === undefined) {
    return unknown("No product form holds the ID of an examined variant of the product.");
  }
  if (others.length > 0) {
    return unknown(`Product forms hold different variants of the product: ${[...ids].join(", ")}.`);
  }
  return { status: "selected", variantId: id };
}

function variantGid({ name, value }: VariantField): string | undefined {
  if (name === "merchandiseId") return VARIANT_GID.test(value) ? value : undefined;
  return NUMERIC_ID.test(value) ? `gid://shopify/ProductVariant/${value}` : undefined;
}

function unknown(reason: string): SelectedVariant {
  return { status: "unknown", reason: `The selected variant is unknown: ${reason}` };
}
