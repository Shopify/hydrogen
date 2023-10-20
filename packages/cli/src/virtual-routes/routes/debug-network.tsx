import {useEffect, useRef, useState} from 'react';
import type {Waterfall, WaterfallItems} from 'flame-chart-js';

import {FlameChartWrapper} from '../components/FlameChartWrapper.jsx';
import {Link} from '@remix-run/react';
import {Script} from '@shopify/hydrogen';

type ServerEvent = {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
  cacheStatus: string;
  graphql?: string;
};

type ServerEvents = {
  smallestStartTime: number;
  mainRequests: ServerEvent[];
  subRequests: Record<string, ServerEvent[]>;
  showPutRequests: boolean;
};

export default function DebugNetwork() {
  // Store server event data that can arrive at anytime across renders
  const serverEvents = useRef<ServerEvents>({
    smallestStartTime: 0,
    mainRequests: [],
    subRequests: {},
    showPutRequests: false,
  });

  // For triggering a react render
  const [timestamp, setTimestamp] = useState<number>();

  // Handle server events
  function serverEventHandler(onEvent: (data: ServerEvent) => void) {
    return (event: MessageEvent) => {
      const data = JSON.parse(event.data) as unknown as ServerEvent;

      if (serverEvents.current.smallestStartTime === 0) {
        serverEvents.current.smallestStartTime = data.startTime;
      } else {
        serverEvents.current.smallestStartTime = Math.min(
          data.startTime,
          serverEvents.current.smallestStartTime,
        );
      }

      onEvent(data);

      setTimeout(() => {
        setTimestamp(new Date().getTime());
      }, 0);
    };
  }

  useEffect(() => {
    const evtSource = new EventSource('/debug-network-server', {
      withCredentials: true,
    });

    const mainRequestHandler = serverEventHandler((data: ServerEvent) => {
      serverEvents.current.mainRequests = [
        ...serverEvents.current.mainRequests,
        {
          ...data,
          url: data.url.replace(location.origin, ''),
        },
      ];
    });
    evtSource.addEventListener('Request', mainRequestHandler);

    const subRequestHandler = serverEventHandler((data: ServerEvent) => {
      let groupEvents = serverEvents.current.subRequests[data.id] || [];
      groupEvents = [...groupEvents, data];
      serverEvents.current.subRequests = {
        ...serverEvents.current.subRequests,
        [data.id]: groupEvents,
      };
    });
    evtSource.addEventListener('Sub request', subRequestHandler);

    return () => {
      evtSource.removeEventListener('Request', mainRequestHandler);
      evtSource.removeEventListener('Sub request', subRequestHandler);
      evtSource.close();
    };
  }, []);

  return (
    <>
      <Script
        src="https://unpkg.com/flame-chart-js@2.3.1/dist/index.min.js"
        suppressHydrationWarning
      />
      <div
        style={{
          width: '100vw',
          backgroundColor: '#F5F5F5',
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
            <button
              onClick={() => {
                fetch('/debug-network-server', {method: 'DELETE'}).catch(
                  (error) => console.error('Could not clear history:', error),
                );

                serverEvents.current = {
                  smallestStartTime: 0,
                  mainRequests: [],
                  subRequests: {},
                  showPutRequests: serverEvents.current.showPutRequests,
                };

                setTimestamp(new Date().getTime());
              }}
            >
              Clear
            </button>
            <input
              id="showPutRequests"
              type="checkbox"
              checked={serverEvents.current.showPutRequests}
              onChange={(event) => {
                serverEvents.current.showPutRequests = event.target.checked;
                setTimestamp(new Date().getTime());
              }}
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
        <FlameChart key={timestamp} serverEvents={serverEvents.current} />
        <p style={{color: '#777', fontSize: '0.7rem', paddingLeft: '5px'}}>
          Note: You may need to turn on '<b>Disable Cache</b>' for your
          navigating window. If you are not seeing any requests, try re-running
          '<b>npm run dev</b>' in your terminal while leaving this window open.
        </p>
      </div>
    </>
  );
}

const PANEL_HEIGHT = 300;

function FlameChart({serverEvents}: {serverEvents: ServerEvents}) {
  if (serverEvents.mainRequests.length === 0)
    return (
      <div
        style={{
          height: `${PANEL_HEIGHT}px`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FAFAFA',
        }}
      >
        <p style={{fontWeight: 'bold', color: '#777'}}>
          Navigate your{' '}
          <Link to="/" target="_blank">
            app
          </Link>
        </p>
      </div>
    );

  let totalRequests = 0;
  let totalSubRequests = 0;

  const calcDuration = (time: number) => time - serverEvents.smallestStartTime;
  let items: WaterfallItems = [];

  serverEvents.mainRequests.forEach((mainRequest: ServerEvent) => {
    const mainResponseStart = calcDuration(mainRequest.endTime);
    let mainResponseEnd = mainResponseStart;

    const subRequestItems: WaterfallItems = [];
    const subRequests = serverEvents.subRequests[mainRequest.id] || [];
    subRequests.forEach((subRequest: ServerEvent) => {
      const subRequestEnd = calcDuration(subRequest.endTime);

      if (subRequest.cacheStatus !== 'PUT') {
        mainResponseEnd = Math.max(mainResponseEnd, subRequestEnd);
      }

      const subRequestItem = {
        name: `${subRequest.cacheStatus} ${subRequest.url}`.trim(),
        intervals: 'request',
        timing: {
          requestStart: calcDuration(subRequest.startTime),
          requestEnd: subRequestEnd,
        },
      };

      if (serverEvents.showPutRequests) {
        subRequestItems.push(subRequestItem);
      } else {
        subRequest.cacheStatus !== 'PUT' &&
          subRequestItems.push(subRequestItem);
      }

      totalSubRequests++;
    });

    totalRequests++;

    items.push({
      name: mainRequest.url,
      intervals: 'mainRequest',
      timing: {
        requestStart: calcDuration(mainRequest.startTime),
        responseStart: mainResponseStart,
        responseEnd: mainResponseEnd,
      },
    });
    items = items.concat(subRequestItems);
  });

  const data: Waterfall = {
    items,
    intervals: {
      mainRequest: [
        {
          name: 'server',
          color: '#99CC00',
          type: 'block',
          start: 'requestStart',
          end: 'responseStart',
        },
        {
          name: 'streaming',
          color: '#33CCFF',
          type: 'block',
          start: 'responseStart',
          end: 'responseEnd',
        },
      ],
      request: [
        {
          name: 'request',
          color: '#FFCC00',
          type: 'block',
          start: 'requestStart',
          end: 'requestEnd',
        },
      ],
    },
  };
  return (
    <>
      <FlameChartWrapper
        height={PANEL_HEIGHT}
        waterfall={data}
        settings={{
          styles: {
            waterfallPlugin: {
              defaultHeight: PANEL_HEIGHT,
            },
          },
        }}
      />
      <div
        style={{
          display: 'flex',
          padding: '5px',
          borderTop: '1px solid #CCC',
          borderBottom: '1px solid #CCC',
        }}
      >
        {totalRequests} requests
        <span
          style={{
            paddingLeft: '2px',
            paddingRight: '2px',
          }}
        >
          |
        </span>
        {totalSubRequests} sub requests
      </div>
    </>
  );
}
