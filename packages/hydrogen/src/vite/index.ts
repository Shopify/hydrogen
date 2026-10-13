export * from "./local-https";

const HYDROGEN_2026_04_BRANCH_URL = "https://github.com/Shopify/hydrogen/tree/2026-04";

/**
 * Projects built on 2026.4 import this name from their `vite.config`. Without it, a project whose `^2026.4.0` range resolved to 2026.10 fails at ESM link time with "does not provide an export named 'hydrogen'" before any Hydrogen code can explain the collision. This export turns that failure into a message with the fix.
 *
 * @deprecated Removed in `@shopify/hydrogen` 2026.10. Pin `@shopify/hydrogen` to `~2026.4.0` to keep using the `hydrogen()` Vite plugin.
 */
export function hydrogen(): never {
  throw new Error(
    [
      `This project is not compatible with @shopify/hydrogen ${__HYDROGEN_VERSION__}.`,
      "Its vite.config imports `hydrogen()` from `@shopify/hydrogen/vite`, which 2026.10 and later no longer provide. A caret range such as `^2026.4.0` resolves to 2026.10.",
      "",
      'To stay on a compatible version, pin "@shopify/hydrogen" to "~2026.4.0" in package.json and reinstall.',
      `Docs and source for 2026.4: ${HYDROGEN_2026_04_BRANCH_URL}`,
    ].join("\n"),
  );
}
