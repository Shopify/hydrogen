import {useEffect, useState} from 'react';
import type {LinksFunction} from '@remix-run/server-runtime';
import {Script} from '@shopify/hydrogen';

import {RequestWaterfall} from '../components/RequestWaterfall.jsx';
import {type ServerEvents} from '../lib/useDebugNetworkServer.jsx';
import {RequestTable} from '../components/RequestTable.jsx';
import {Link} from '@remix-run/react';

import favicon from '../assets/favicon.svg';
import faviconDark from '../assets/favicon-dark.svg';
import {useDebugNetworkServer} from '../lib/useDebugNetworkServer.jsx';
import {RequestDetails} from '../components/RequestDetails.jsx';
import {IconClose} from '../components/IconClose.jsx';
import {IconDiscard} from '../components/IconDiscard.jsx';

// @ts-expect-error
import styles from '../assets/debug-network.css?url';

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

declare global {
  var setActiveEventId: (eventId: string) => void;
}

export default function DebugNetwork() {
  const {
    serverEvents,
    clear,
    timestamp,
    setHidePutRequests,
    setPreserveLog,
    setHideNotification,
  } = useDebugNetworkServer();

  const isEmptyState = serverEvents.mainRequests.length === 0;

  return (
    <div
      id="server-network-timing"
      className={`${serverEvents.hideNotification ? '' : 'withNotification'}`}
    >
      <Script
        src="https://unpkg.com/flame-chart-js@2.3.2/dist/index.min.js"
        suppressHydrationWarning
      />
      <NotificationBanner
        hideNotification={serverEvents.hideNotification}
        setHideNotification={setHideNotification}
      />
      <DebugHeader />
      <div id="main" className={`${isEmptyState ? ' empty' : ''}`}>
        <OptionsAndLegend
          serverEvents={serverEvents}
          clearCallback={clear}
          setHidePutRequests={setHidePutRequests}
          setPreserveLog={setPreserveLog}
        />
        <div id="request-waterfall" className="pad">
          {isEmptyState ? (
            <EmptyState />
          ) : (
            <div className="request-waterfall-chart">
              <RequestWaterfall
                key={timestamp}
                serverEvents={serverEvents}
                config={WATERFALL_CONFIG}
              />
            </div>
          )}
        </div>
        <RequestInfo serverEvents={serverEvents} />
      </div>
    </div>
  );
}

function NotificationBanner({
  hideNotification,
  setHideNotification,
}: {
  hideNotification: boolean | undefined;
  setHideNotification: (hideNotification: boolean) => void;
}) {
  if (hideNotification) {
    return null;
  }

  return (
    <div className="notification">
      <div id="close-notification">
        <button
          className="plain icon"
          onClick={() => {
            setHideNotification(true);
          }}
        >
          <IconClose />
        </button>
      </div>
      <p>
        Note: You may need to turn on 'Disable Cache' for your navigating
        window.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div id="empty-view">
      <p className="text-large bold">Navigate to your app</p>
      <p className="text-normal">
        Open your localhost to initiate subrequest profiler
      </p>
      <Link to="/" target="_blank" className="link-margin-top">
        <button className="primary">Open app</button>
      </Link>
    </div>
  );
}

function DebugHeader() {
  return (
    <header className="justify-between text-large">
      <div className="flex-row">
        <img className="logo" src={faviconDark} alt="Hydrogen logo" />
        <h1>Subrequest Profiler</h1>
        <span className="pill">Development</span>
      </div>
    </header>
  );
}

function OptionsAndLegend({
  serverEvents,
  clearCallback,
  setHidePutRequests,
  setPreserveLog,
}: {
  serverEvents: ServerEvents;
  clearCallback: () => void;
  setHidePutRequests: (checked: boolean) => void;
  setPreserveLog: (checked: boolean) => void;
}) {
  return (
    <div id="options-and-legend" className="justify-between pad">
      <div className="flex-row text-large">
        <button id="buttonClear" onClick={() => clearCallback()}>
          <IconDiscard />
          <span>Clear</span>
        </button>
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
          <p className="bold-1">Main Request</p>
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

function RequestInfo({serverEvents}: {serverEvents: ServerEvents}) {
  const [activeEventId, setActiveEventId] = useState<string | undefined>();

  useEffect(() => {
    // Exposing setActiveEventId to the window for the flame chart
    window.setActiveEventId = setActiveEventId;
  }, []);

  useEffect(() => {
    if (!activeEventId) {
      setActiveEventId(undefined);
    }
  }, [activeEventId]);

  return (
    <div id="request-info">
      <div className="overflow-hidden">
        <RequestTable
          serverEvents={serverEvents}
          activeEventId={activeEventId}
          setActiveEventId={setActiveEventId}
        />
      </div>
      <div
        id="request-details-panel"
        className={`${activeEventId ? 'active' : ''}`}
      >
        <RequestDetails
          serverEvents={serverEvents}
          activeEventId={activeEventId}
          setActiveEventId={setActiveEventId}
        />
      </div>
    </div>
  );
}
