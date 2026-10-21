import { redirect } from "remix/response/redirect";

/**
 * The Storefront API resolves a translated handle to the resource's canonical handle in
 * the active locale. Redirect so the URL always uses that locale's handle.
 */
export function redirectIfHandleIsLocalized(
  request: Request,
  ...resources: Array<{ handle: string; data: { handle: string } }>
): Response | null {
  const url = new URL(request.url);
  let changed = false;

  for (const { handle, data } of resources) {
    if (handle === data.handle) continue;
    url.pathname = url.pathname.replace(
      encodeURIComponent(handle),
      encodeURIComponent(data.handle),
    );
    changed = true;
  }

  return changed ? redirect(`${url.pathname}${url.search}`) : null;
}
