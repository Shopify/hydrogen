import { applyPrivateResponseCacheHeaders } from "../headers";
import type { ContentSecurityPolicy } from "./types";

export const CSP_HEADER = "Content-Security-Policy";
export const CSP_REPORT_ONLY_HEADER = "Content-Security-Policy-Report-Only";

export function forwardContentSecurityPolicy(headers: Headers, policy?: ContentSecurityPolicy) {
  if (!policy) return;
  // Do not let a downstream renderer use an incoming report-only policy as a nonce source.
  headers.delete(CSP_REPORT_ONLY_HEADER);
  headers.set(CSP_HEADER, policy.header);
}

export function applyContentSecurityPolicy(headers: Headers, policy?: ContentSecurityPolicy) {
  if (!policy) return;
  const existing = headers.get(CSP_HEADER);
  if (existing !== null && existing !== policy.header) {
    throw new TypeError("The response already has a different Content-Security-Policy.");
  }
  headers.set(CSP_HEADER, policy.header);
  // A cached document would reuse a nonce on subsequent responses.
  if (policy.nonce !== undefined) applyPrivateResponseCacheHeaders(headers);
}
