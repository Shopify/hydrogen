import type {
  MenuItem,
  Menu,
} from "@shopify/hydrogen-ui-alpha/storefront-api-types";

// @ts-expect-error types not available
import typographicBase from "typographic-base";

export interface EnhancedMenuItem extends MenuItem {
  to: string;
  target: string;
  isExternal?: boolean;
  items: EnhancedMenuItem[];
}

export interface EnhancedMenu extends Menu {
  items: EnhancedMenuItem[];
}

export function missingClass(string?: string, prefix?: string) {
  if (!string) {
    return true;
  }

  const regex = new RegExp(` ?${prefix}`, "g");
  return string.match(regex) === null;
}

export function formatText(input?: string | React.ReactNode) {
  if (!input) {
    return;
  }

  if (typeof input !== "string") {
    return input;
  }

  return typographicBase(input, { locale: "en-us" }).replace(
    /\s([^\s<]+)\s*$/g,
    "\u00A0$1"
  );
}

export function getExcerpt(text: string) {
  const regex = /<p.*>(.*?)<\/p>/;
  const match = regex.exec(text);
  return match?.length ? match[0] : text;
}
