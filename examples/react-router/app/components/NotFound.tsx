import { Link } from "react-router";

/**
 * Shared 404 / not-found UI. Rendered by `routes/catchall.tsx` (the framework
 * catch-all) and by per-route `ErrorBoundary` exports when
 * `isRouteErrorResponse(error) && error.status === 404` (R1). Extracting the
 * markup keeps the 404 presentation consistent across the catch-all route and
 * route-level error boundaries (D3).
 */
export function NotFound() {
  return (
    <div className="max-w-page px-margin mx-auto w-full py-16 text-center">
      <h1 className="type-display mb-4">Page not found</h1>
      <p className="type-body text-on-surface-secondary mb-8">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        to="/"
        className="rounded-button button-primary inline-flex h-11 items-center justify-center px-5 text-sm font-medium no-underline"
      >
        Back to home
      </Link>
    </div>
  );
}
