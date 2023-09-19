import {useRouteError, isRouteErrorResponse} from '@remix-run/react';

export default function Index() {
  return (
    <div className="bun-wrapper">
      <h1>Welcome to</h1>
      <img className="hydrogen" src="/hydrogen.webp" alt="Hydrogen logo" />
      <img className="bun" src="/bun.svg" alt="Bun logo" />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    console.error(error.status, error.statusText, error.data);
    return <div>Route Error</div>;
  } else {
    console.error((error as Error).message);
    return <div>Thrown Error</div>;
  }
}
