import { SFAPI_REQUEST_HEADER_ALLOWLIST } from "../headers";
import { SFAPI_RE } from "../url";
import { createProxyInterceptor } from "./proxy";

export const handleSfapiProxy = createProxyInterceptor({
  match: SFAPI_RE,
  allowlist: SFAPI_REQUEST_HEADER_ALLOWLIST,
  formatError: (message) => ({ error: message }),
  logPrefix: "SFAPI proxy",
});
