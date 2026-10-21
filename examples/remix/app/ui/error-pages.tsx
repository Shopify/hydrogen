import type { Handle } from "remix/component";

import { Document } from "./document.tsx";

export function NotFoundPage(handle: Handle<{ pathname?: string }>) {
  return () => (
    <Document title="Hydrogen | Not found">
      <div class="route-error">
        <h1>Oops</h1>
        <h2>404</h2>
        <fieldset>
          <pre>{handle.props.pathname ? `${handle.props.pathname} not found` : "Not found"}</pre>
        </fieldset>
      </div>
    </Document>
  );
}

export function ErrorPage() {
  return () => (
    <Document title="Hydrogen | Error">
      <div class="route-error">
        <h1>Oops</h1>
        <h2>500</h2>
        <fieldset>
          <pre>An unexpected error occurred.</pre>
        </fieldset>
      </div>
    </Document>
  );
}
