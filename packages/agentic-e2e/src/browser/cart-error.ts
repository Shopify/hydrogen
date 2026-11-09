/**
 * Why the cart JSON could not be read. Fixed messages only.
 * - `unavailable`: the page is not a storefront page, or sets an unsupported routes root.
 * - `request-failed`: the request failed, redirected, or answered an HTTP error (`httpStatus`).
 * - `timeout`: the response did not arrive in time.
 * - `invalid-response`: the response is not JSON, or does not have the cart shape.
 * - `unreadable`: the browser or the page evaluation failed.
 */
export type CartReadErrorCode =
  | "unavailable"
  | "request-failed"
  | "timeout"
  | "invalid-response"
  | "unreadable";

export class CartReadError extends Error {
  readonly code: CartReadErrorCode;
  readonly httpStatus: number | undefined;

  constructor(code: CartReadErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "CartReadError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
