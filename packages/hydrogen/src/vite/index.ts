export * from "./local-https";

const HYDROGEN_2_BRANCH_URL = "https://github.com/Shopify/hydrogen/tree/2026-04";

/**
 * Hydrogen 2 projects import this name from their `vite.config`. Without it, a project whose `^2026.4.0` range resolved to 2026.10 fails at ESM link time with "does not provide an export named 'hydrogen'" before any Hydrogen code can explain the collision. This export turns that failure into a message with the fix.
 *
 * @deprecated Hydrogen 3 removed the `hydrogen()` Vite plugin. Pin `@shopify/hydrogen` to `~2026.4.0` to stay on Hydrogen 2.
 */
export function hydrogen(): never {
  throw new Error(
    [
      `@shopify/hydrogen ${__HYDROGEN_VERSION__} is Hydrogen 3, which has no \`hydrogen()\` Vite plugin.`,
      "This vite.config imports it, so this is a Hydrogen 2 project whose `@shopify/hydrogen` range resolved to Hydrogen 3. A caret range such as `^2026.4.0` does that.",
      "",
      'To stay on Hydrogen 2, pin "@shopify/hydrogen" to "~2026.4.0" in package.json and reinstall.',
      `Hydrogen 2 lives on the 2026-04 branch: ${HYDROGEN_2_BRANCH_URL}`,
    ].join("\n"),
  );
}
