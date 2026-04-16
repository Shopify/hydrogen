export type WaitUntil = (promise: Promise<unknown>) => void;

export type StorefrontHeaders = {
  /** A unique ID that correlates all sub-requests together. */
  requestGroupId: string | null;
  /** The IP address of the client. */
  buyerIp: string | null;
  /** The signature of the client's IP address for verification. */
  buyerIpSig: string | null;
  /** The cookie header from the client  */
  cookie: string | null;
  /** The sec-purpose or purpose header value */
  purpose: string | null;
};
