import type { Handle, RemixNode } from "remix/component";

import type { DocumentAssets } from "../assets.ts";
import type { Layout } from "../lib/layout.ts";
import type { Locale } from "../lib/public/i18n.ts";

export type AppShellValue = {
  assets: DocumentAssets;
  /** `null` while rendering an error page whose shell data failed to load. */
  layout: Layout | null;
  locale: Locale;
  /** The prefix-free app pathname, for active navigation links. */
  pathname: string;
  nonce: string;
};

/** Provides request-scoped shell values to `<Document>` through component context. */
export function AppShell(handle: Handle<AppShellValue & { children?: RemixNode }, AppShellValue>) {
  return () => {
    const { children, ...value } = handle.props;
    handle.context.set(value);
    return children;
  };
}
