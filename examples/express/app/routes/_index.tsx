import {useRouteError, isRouteErrorResponse, Link} from 'react-router';

export default function Index() {
  return (
    <>
      <h1>Hydrogen Express Example</h1>
      <p>
        This example shows how to use Hydrogen with Express.js for Node.js deployments
        instead of Oxygen/Workers.
      </p>
      <p>
        <Link to="/products/the-carbon">View Example Product</Link>
      </p>
    </>
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
