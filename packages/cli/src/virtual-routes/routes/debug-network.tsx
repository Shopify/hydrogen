import type {LinksFunction} from '@remix-run/server-runtime';
import {Script} from '@shopify/hydrogen';

import {
  RequestWaterfall,
  type ServerEvents,
} from '../components/RequestWaterfall.jsx';
import {RequestTable} from '../components/RequestTable.jsx';

import favicon from '../assets/favicon.svg';
import faviconDark from '../assets/favicon-dark.svg';
import styles from '../assets/debug-network.css';
import {useDebugNetworkServer} from '../lib/useDebugNetworkServer.jsx';
import {WaterfallPlugin} from 'flame-chart-js';

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

const WATERFALL_CONFIG = {
  colors: {
    server: '#2ED389',
    streaming: '#33CCFF',
    subRequest: '#FFCC00',
  },
};

export default function DebugNetwork() {
  const {
    serverEvents,
    clear,
    stop,
    record,
    timestamp,
    setHidePutRequests,
    setPreserveLog,
  } = useDebugNetworkServer();

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
      <div className="pad">
        <OptionsAndLegend
          serverEvents={serverEvents}
          setHidePutRequests={setHidePutRequests}
          setPreserveLog={setPreserveLog}
        />
        <div className="panel">
          <RequestWaterfall
            key={timestamp}
            serverEvents={serverEvents}
            config={WATERFALL_CONFIG}
          />
        </div>
        <div id="request-info">
          <div className="panel no-pad">
            <RequestTable serverEvents={serverEvents} />
          </div>
          <div className="panel">
            <p>Request details</p>
          </div>
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
    <header className="justify-between text-large">
      <div className="flex-row">
        <img className="logo" src={faviconDark} alt="Hydrogen logo" />
        <h1>Server Network Timing</h1>
        <span className="tab">Dev</span>
      </div>
      <div className="flex-row">
        <button
          style={{width: '70px'}}
          onClick={() =>
            serverEvents.recordEvents ? stopCallback() : recordCallback()
          }
        >
          {serverEvents.recordEvents ? 'Stop' : 'Record'}
        </button>
        <button className="primary" onClick={() => clearCallback()}>
          Clear
        </button>
      </div>
    </header>
  );
}

function OptionsAndLegend({
  serverEvents,
  setHidePutRequests,
  setPreserveLog,
}: {
  serverEvents: ServerEvents;
  setHidePutRequests: (checked: boolean) => void;
  setPreserveLog: (checked: boolean) => void;
}) {
  return (
    <div id="options-and-legend" className="justify-between">
      <div className="flex-row text-large">
        <div className="form-control">
          <input
            id="hidePutRequests"
            type="checkbox"
            checked={serverEvents.hidePutRequests}
            onChange={(event) => setHidePutRequests(event.target.checked)}
          />
          <label htmlFor="hidePutRequests">
            Hide cache update requests (PUT)
          </label>
        </div>
        <div className="form-control">
          <input
            id="preserveLog"
            type="checkbox"
            checked={serverEvents.preserveLog}
            onChange={(event) => setPreserveLog(event.target.checked)}
          />
          <label htmlFor="preserveLog">Preserve Log</label>
        </div>
      </div>
      <div className="flex-row text-normal gap-small">
        <div className="legend flex-row">
          <p>
            <b>Main Request</b>
          </p>
          <p className="flex-row gap-small">
            <span
              className="swatch"
              style={{
                backgroundColor: WATERFALL_CONFIG.colors.server,
              }}
            ></span>
            Time on server
          </p>
          <p className="flex-row gap-small">
            <span
              className="swatch"
              style={{
                backgroundColor: WATERFALL_CONFIG.colors.streaming,
              }}
            ></span>
            Time to stream to client
          </p>
        </div>
        <div className="legend flex-row">
          <p className="flex-row gap-small">
            <span
              className="swatch"
              style={{
                backgroundColor: WATERFALL_CONFIG.colors.subRequest,
              }}
            ></span>
            Sub request
          </p>
        </div>
      </div>
    </div>
  );
}
