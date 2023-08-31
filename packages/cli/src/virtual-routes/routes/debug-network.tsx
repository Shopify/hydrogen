import {useEffect, useRef, useState} from 'react';
import type {Waterfall, WaterfallItems} from 'flame-chart-js';

import {FlameChartWrapper} from '../components/FlameChartWrapper.jsx';
import {Link} from '@remix-run/react';

type ServerEvent = {
  id: string;
  url: string;
  startTime: number;
  endTime: number;
};

type ServerEvents = {
  smallestStartTime: number;
  mainRequests: ServerEvent[];
  subRequests: Record<string, ServerEvent[]>;
};

export default function DebugNetwork() {
  // Store server event data that can arrive at anytime across renders
  const serverEvents = useRef<ServerEvents>({
    smallestStartTime: 0,
    mainRequests: [],
    subRequests: {},
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
      <div
        style={{
          width: '100vw',
          backgroundColor: '#F5F5F5',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => {
              serverEvents.current = {
                smallestStartTime: 0,
                mainRequests: [],
                subRequests: {},
              };
              setTimestamp(new Date().getTime());
            }}
          >
            Clear
          </button>
          <p
            style={{
              paddingRight: '5px',
              fontSize: '0.8rem',
            }}
          >
            Unstable
          </p>
        </div>
        <FlameChart key={timestamp} serverEvents={serverEvents.current} />
        <p style={{color: '#777', fontSize: '0.8rem', paddingLeft: '5px'}}>
          Note: You may need to turn on '<b>Disable Cache</b>' for your
          navigating window.
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

  const calcDuration = (time: number) => time - serverEvents.smallestStartTime;
  let items: WaterfallItems = [];

  serverEvents.mainRequests.forEach((mainRequest: ServerEvent) => {
    const mainResponseStart = calcDuration(mainRequest.endTime);
    let mainResponseEnd = mainResponseStart;

    const subRequestItems: WaterfallItems = [];
    const subRequests = serverEvents.subRequests[mainRequest.id] || [];
    subRequests.forEach((subRequest: ServerEvent) => {
      const subRequestEnd = calcDuration(subRequest.endTime);
      mainResponseEnd = Math.max(mainResponseEnd, subRequestEnd);

      subRequestItems.push({
        name: subRequest.url,
        intervals: 'request',
        timing: {
          requestStart: calcDuration(subRequest.startTime),
          requestEnd: subRequestEnd,
        },
      });
    });

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
  );
}
