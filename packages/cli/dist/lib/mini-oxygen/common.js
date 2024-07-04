import { outputToken, outputInfo, outputContent } from '@shopify/cli-kit/node/output';
import colors from '@shopify/cli-kit/node/colors';
import { DEV_ROUTES } from '../request-events.js';
import { AbortError } from '@shopify/cli-kit/node/error';

const DEFAULT_INSPECTOR_PORT = 9229;
const SUBREQUEST_PROFILER_ENDPOINT = "/debug-network-server";
function handleMiniOxygenImportFail() {
  throw new AbortError(
    "Could not load MiniOxygen.",
    "Please make sure you have `@shopify/mini-oxygen` installed."
  );
}
function logRequestLine({
  request,
  response,
  meta
}) {
  try {
    const url = new URL(request.url);
    if (DEV_ROUTES.has(url.pathname) || url.pathname === "/favicon.ico") return;
    const isDataRequest = url.searchParams.has("_data");
    let route = request.url.replace(url.origin, "");
    let info = "";
    let type = "render";
    if (isDataRequest) {
      type = request.method === "GET" ? "loader" : "action";
      const dataParam = url.searchParams.get("_data")?.replace("routes/", "");
      route = url.pathname;
      info = `[${dataParam}]`;
    }
    const colorizeStatus = response.status < 300 ? outputToken.green : response.status < 400 ? outputToken.cyan : outputToken.errorText;
    outputInfo(
      outputContent`${request.method.padStart(6)}  ${colorizeStatus(
        String(response.status)
      )}  ${outputToken.italic(type.padEnd(7, " "))} ${route} ${meta.durationMs > 0 ? colors.dim(` ${meta.durationMs}ms`) : ""}${info ? "  " + colors.dim(info) : ""}${request.headers["purpose"] === "prefetch" ? outputToken.italic(colors.dim("  prefetch")) : ""}`
    );
  } catch {
    if (request && response?.status) {
      outputInfo(`${request.method} ${response.status} ${request.url}`);
    }
  }
}

export { DEFAULT_INSPECTOR_PORT, SUBREQUEST_PROFILER_ENDPOINT, handleMiniOxygenImportFail, logRequestLine };
