"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="bg-surface text-on-surface font-body antialiased">
        <main id="main-content" tabIndex={-1} className="max-w-page px-margin mx-auto py-16">
          <h1 className="type-display text-on-surface">Something went wrong</h1>
          <p className="text-on-surface-secondary mt-4">Please refresh and try again.</p>
        </main>
      </body>
    </html>
  );
}
