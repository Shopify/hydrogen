/**
 * Optional subrequest profiling hook injected by Hydrogen's Vite plugin.
 * When undefined (outside of Hydrogen's dev server), the optional-chaining
 * in run-with-cache.ts safely no-ops. Using `any` to avoid pulling in the
 * framework-specific RequestEventPayload type.
 */
declare var __H2O_LOG_EVENT: undefined | ((event: any) => void);
