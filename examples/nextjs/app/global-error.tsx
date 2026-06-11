"use client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container mx-auto p-4 pt-16">
          <h1>Something went wrong</h1>
          <p>{error.digest ? `Error: ${error.digest}` : "An unexpected error occurred."}</p>
          <button onClick={() => unstable_retry()} className="underline">
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
