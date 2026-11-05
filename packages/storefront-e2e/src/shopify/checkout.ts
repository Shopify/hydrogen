import type { EvidenceRecord } from "../evidence.ts";

/**
 * True for the first signal that the buyer attempted checkout, verified or not. A checkout
 * request blocked in an embedded frame (for example a checkout button widget that loads when
 * the cart renders) is not a handoff. A record with a missing or unknown `frame` is a handoff
 * (fail closed).
 */
export function isCheckoutHandoff(record: EvidenceRecord): boolean {
  return (
    record.kind === "checkout" ||
    (record.kind === "navigation-blocked" &&
      record.data.reason === "checkout" &&
      record.data.frame !== "embedded")
  );
}
