import type {CartLineUpdateInput} from '@shopify/hydrogen-react/storefront-api-types';

const PENDING_PREFIX = '__h_pending_';

export function getOptimisticLineId(variantId: string) {
  return PENDING_PREFIX + variantId;
}

export function isOptimisticLineId(lineId: string) {
  return lineId.startsWith(PENDING_PREFIX);
}

export function throwIfLinesAreOptimistic(
  type: string,
  lines: CartLineUpdateInput[] | string[],
) {
  if (
    lines.some((line) =>
      isOptimisticLineId(typeof line === 'string' ? line : line.id),
    )
  ) {
    throw new Error(
      `Tried to perform an action on an optimistic line. Make sure to disable your "${type}" CartForm action when the line is optimistic.`,
    );
  }
}
