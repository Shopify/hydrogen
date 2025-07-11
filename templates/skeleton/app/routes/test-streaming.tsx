import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData} from 'react-router';
import {Suspense} from 'react';

export async function loader({context}: LoaderFunctionArgs) {
  // Critical data - await this
  const criticalData = await Promise.resolve('This is critical data loaded immediately');

  // Deferred data - return the promise directly (don't await)
  // This simulates a slow API call
  const deferredData = new Promise<string>((resolve) => {
    // Use a more realistic delay
    setTimeout(() => {
      resolve('This data was streamed after 2 seconds');
    }, 2000);
  });

  return {
    criticalData,
    deferredData,
  };
}

export default function TestStreaming() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{padding: '2rem'}}>
      <h1>Streaming Test</h1>
      
      <section>
        <h2>Critical Data (Loaded Immediately)</h2>
        <p>{data.criticalData}</p>
      </section>

      <section>
        <h2>Deferred Data (Streamed)</h2>
        <Suspense fallback={<p>⏳ Loading deferred data...</p>}>
          <Await resolve={data.deferredData}>
            {(deferredData) => (
              <p>✅ {deferredData}</p>
            )}
          </Await>
        </Suspense>
      </section>

      <section style={{marginTop: '2rem', padding: '1rem', background: '#f0f0f0'}}>
        <h3>How this works:</h3>
        <ul>
          <li>Critical data is awaited in the loader, so it's available on first render</li>
          <li>Deferred data is returned as a promise (not awaited)</li>
          <li>React streams the HTML with the Suspense boundary showing the fallback</li>
          <li>When the promise resolves, React streams the updated content</li>
          <li>The client hydrates smoothly because React Router handles the streaming state</li>
        </ul>
      </section>
    </div>
  );
} 