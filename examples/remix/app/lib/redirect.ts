import { redirect } from "remix/response/redirect";

/** Redirects to the typed canonical route when the Storefront API resolves translated handles. */
export function redirectIfHandleIsLocalized(
  request: Request,
  canonicalPath: string,
  ...resources: Array<{ handle: string; data: { handle: string } }>
): Response | null {
  if (resources.every(({ handle, data }) => handle === data.handle)) return null;

  const url = new URL(request.url);
  url.pathname = canonicalPath;
  return redirect(`${url.pathname}${url.search}`);
}
