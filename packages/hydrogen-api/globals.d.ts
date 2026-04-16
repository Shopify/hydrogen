/**
 * Will be `true` in the development builds of Hydrogen, and `false` in the production builds.
 * Useful for dev-only warnings or messages.
 *
 * Critical errors should still be thrown outside of a `__HYDROGEN_DEV__` check,
 * so that the errors are still logged in production scenarios.
 */
declare var __HYDROGEN_DEV__: boolean;

/**
 * Optional subrequest profiling hook injected by Hydrogen's Vite plugin.
 * When undefined (outside of Hydrogen's dev server), the optional-chaining
 * in run-with-cache.ts safely no-ops. Using `any` to avoid pulling in the
 * framework-specific RequestEventPayload type.
 */
declare var __H2O_LOG_EVENT: undefined | ((event: any) => void);
