// src/oxygen/getStorefrontHeaders.ts
function getStorefrontHeaders(request) {
  const headers = request.headers;
  return {
    requestGroupId: headers.get("request-id"),
    buyerIp: headers.get("oxygen-buyer-ip"),
    cookie: headers.get("cookie"),
    purpose: headers.get("purpose")
  };
}

export {
  getStorefrontHeaders
};
