export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event) => {
    const requestContext = event.context.storefrontRequestContext;
    if (!requestContext) return;

    const headers = new Headers();
    copyHeader(event.node.res.getHeader("content-type"), (value) => {
      headers.set("content-type", value);
    });
    copyHeader(event.node.res.getHeader("server-timing"), (value) => {
      headers.append("server-timing", value);
    });

    requestContext.applyResponseHeaders(headers);

    const serverTiming = headers.get("server-timing");
    if (serverTiming) {
      event.node.res.setHeader("server-timing", serverTiming);
    }

    const setCookies = headers.getSetCookie();
    if (setCookies.length > 0) {
      event.node.res.setHeader("set-cookie", [
        ...normalizeSetCookie(event.node.res.getHeader("set-cookie")),
        ...setCookies,
      ]);
    }
  });
});

function copyHeader(value: number | string | string[] | undefined, copy: (value: string) => void) {
  if (Array.isArray(value)) {
    for (const item of value) copy(item);
  } else if (value != null) {
    copy(String(value));
  }
}

function normalizeSetCookie(value: number | string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}
