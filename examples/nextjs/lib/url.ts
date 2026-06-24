export type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function pageSearchParamsToUrlSearchParams(searchParams: PageSearchParams) {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [name, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(name, item);
      }
    } else if (value != null) {
      params.set(name, value);
    }
  }

  return params;
}
