"use client";

/**
 * Global error boundary (`app/global-error.tsx`) — renders when the root layout
 * itself throws (engineering.md F8). Unlike `app/error.tsx` (a segment boundary
 * that renders inside the root layout), this must render its own
 * `<html>`/`<body>` shell and must NOT depend on any provider/context from the
 * root layout (the layout is the thing that threw).
 *
 * Kept intentionally minimal (pure HTML + inline styles, no hooks that consume
 * global context) to avoid the known Next.js 16 + React 19.2 `/_global-error`
 * prerender bug (vercel/next.js#84994) where `AppRouterContext` is null during
 * static generation of the internal error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: "40rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 300, marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "0.5rem" }}>{error.message}</p>
          {error.digest ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
              Error digest: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              height: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#1b4332",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
