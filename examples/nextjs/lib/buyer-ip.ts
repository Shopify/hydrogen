const FIRST_FORWARDED_IP_INDEX = 0;

export const BUYER_IP_HEADERS = ["x-forwarded-for"] as const;
export const DEVELOPMENT_BUYER_IP = "127.0.0.1";

export function getBuyerIp(headers: Pick<Headers, "get">): string {
  const buyerIp = headers.get("x-forwarded-for")?.split(",")[FIRST_FORWARDED_IP_INDEX]?.trim();
  if (buyerIp) return buyerIp;

  if (process.env.NODE_ENV !== "production") return DEVELOPMENT_BUYER_IP;

  throw new Error(`${BUYER_IP_HEADERS.join(", ")} is required for private Storefront API clients`);
}
