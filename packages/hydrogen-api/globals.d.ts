/**
 * Will be `true` in the development builds of Hydrogen, and `false` in the production builds.
 * Useful for dev-only warnings or messages.
 *
 * Critical errors should still be thrown outside of a `__HYDROGEN_DEV__` check,
 * so that the errors are still logged in production scenarios.
 */
declare var __HYDROGEN_DEV__: boolean;
