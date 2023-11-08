import type {LinksFunction} from '@remix-run/server-runtime';
import {Script} from '@shopify/hydrogen';

import {
  RequestWaterfall,
  type ServerEvents,
} from '../components/RequestWaterfall.jsx';

import favicon from '../assets/favicon.svg';
import faviconDark from '../assets/favicon-dark.svg';
import styles from '../assets/debug-network.css';
import {useDebugNetworkServer} from '../lib/useDebugNetworkServer.jsx';

export const links: LinksFunction = () => {
  return [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: favicon,
    },
    {
      rel: 'stylesheet',
      href: styles,
    },
  ];
};

export default function DebugNetwork() {
  const {serverEvents, clear, stop, record, timestamp, setShowPutRequests} =
    useDebugNetworkServer();

  return (
    <>
      <Script
        src="https://unpkg.com/flame-chart-js@2.3.1/dist/index.min.js"
        suppressHydrationWarning
      />
      <DebugHeader
        serverEvents={serverEvents}
        clearCallback={clear}
        stopCallback={stop}
        recordCallback={record}
      />
      <div
        style={{
          width: '100vw',
          fontSize: '0.8rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              id="showPutRequests"
              type="checkbox"
              checked={serverEvents.showPutRequests}
              onChange={(event) => setShowPutRequests(event.target.checked)}
            />
            <label htmlFor="showPutRequests">
              Show cache update requests (PUT)
            </label>
          </div>
          <p
            style={{
              paddingRight: '5px',
            }}
          >
            Unstable
          </p>
        </div>
        <div id="waterfall-panel">
          <RequestWaterfall key={timestamp} serverEvents={serverEvents} />
        </div>
      </div>
    </>
  );
}

function DebugHeader({
  serverEvents,
  clearCallback,
  stopCallback,
  recordCallback,
}: {
  serverEvents: ServerEvents;
  clearCallback: () => void;
  stopCallback: () => void;
  recordCallback: () => void;
}) {
  return (
    <header className="justify-content">
      <div className="flex-row">
        <img className="logo" src={faviconDark} alt="Hydrogen logo" />
        <h1>Server Network Timing</h1>
        <span className="tab">Dev</span>
      </div>
      <div className="flex-row">
        <button
          className="primary"
          style={{width: '70px'}}
          onClick={() =>
            serverEvents.recordEvents ? stopCallback() : recordCallback()
          }
        >
          {serverEvents.recordEvents ? 'Stop' : 'Record'}
        </button>
        <button onClick={() => clearCallback()}>Clear</button>
      </div>
    </header>
  );
}
