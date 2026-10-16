import { signifier, type SignifierAttributes } from "../signifiers";
import type { AvailableFilterValue } from "./state";

/**
 * Returns signifier attributes for a filter value control. Pass the Storefront API value, not its parent filter.
 * Keep the control's checked state, form fields, handlers, and accessible label.
 *
 * @publicDocs
 */
export function getFilterValueAttributes(
  value: AvailableFilterValue,
): SignifierAttributes<"collection-filter-value"> {
  return signifier("collection-filter-value", { filterId: value.id });
}
