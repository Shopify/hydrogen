/**
 * Shared parsing for `:param` route templates such as `/products/:productHandle`
 * or `/sitemap/:type/:page.xml`. Standard routes, registered route handlers,
 * and the sitemap handlers all build on these so the template syntax is
 * defined once.
 */
export const ROUTE_TEMPLATE_PARAM_RE = /:([A-Za-z][A-Za-z0-9_]*)/g;

type ParamNameFilter = (name: string) => boolean;

const ANY_PARAM: ParamNameFilter = () => true;

/** Escapes regex metacharacters so template text can be embedded in a `RegExp` literally. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Names of every `:param` placeholder in `template`, in order. */
export function getRouteTemplateParamNames(template: string): string[] {
  return [...template.matchAll(ROUTE_TEMPLATE_PARAM_RE)].map(([, name]) => name ?? "");
}

export function isRouteTemplate(template: string): boolean {
  return getRouteTemplateParamNames(template).length > 0;
}

/**
 * Converts a route template into an anchored regular expression with one named
 * capture per placeholder. Each capture matches a single path segment, or the
 * part of a segment before a literal suffix such as `.xml`. Placeholders
 * rejected by `isParamName` are kept as literal text.
 */
export function compileRouteTemplate(
  template: string,
  isParamName: ParamNameFilter = ANY_PARAM,
): RegExp {
  const source = escapeRegExp(template).replace(
    ROUTE_TEMPLATE_PARAM_RE,
    (placeholder, name: string) => (isParamName(name) ? `(?<${name}>[^/]+?)` : placeholder),
  );

  return new RegExp(`^${source}$`);
}

/** Matches a pathname against a compiled template and returns decoded params, or `null`. */
export function matchRouteTemplate(
  pattern: RegExp,
  pathname: string,
): Record<string, string> | null {
  const match = pattern.exec(pathname);
  if (!match) return null;

  const params: Record<string, string> = {};
  for (const [name, value] of Object.entries(match.groups ?? {})) {
    params[name] = decodePathSegment(value);
  }

  return params;
}

/** Replaces each `:param` with its encoded value; unknown or missing params stay literal. */
export function interpolateRouteTemplate(
  template: string,
  params: Readonly<Record<string, string | undefined>>,
  isParamName: ParamNameFilter = ANY_PARAM,
): string {
  return template.replace(ROUTE_TEMPLATE_PARAM_RE, (placeholder, name: string) => {
    if (!isParamName(name)) return placeholder;

    const value = params[name];
    return value === undefined ? placeholder : encodeURIComponent(value);
  });
}
