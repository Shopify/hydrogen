import type {LinksFunction} from '@shopify/remix-oxygen';
import {useEffect, useRef, useState} from 'react';
import {Script} from '@shopify/hydrogen';
import {
  RequestWaterfall,
  type ServerEvent,
  type ServerEvents,
} from '../components/RequestWaterfall.jsx';

import styles from '../assets/debug-network.css';

export const links: LinksFunction = () => {
  return [{rel: 'stylesheet', href: styles}];
};

export default function DebugNetwork() {
  // Store server event data that can arrive at anytime across renders
  const serverEvents = useRef<ServerEvents>({
    smallestStartTime: 0,
    mainRequests: [],
    subRequests: {},
    showPutRequests: false,
    viewportHeight: 300,
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

    serverEvents.current.viewportHeight = window.innerHeight;

    return () => {
      evtSource.removeEventListener('Request', mainRequestHandler);
      evtSource.removeEventListener('Sub request', subRequestHandler);
      evtSource.close();
    };
  }, []);

  // CSS resize: https://twitter.com/jh3yy/status/1707514774685106581

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
        <Header
          serverEvents={serverEvents.current}
          setServerEvents={(newServerEvents) => {
            serverEvents.current = newServerEvents;
            setTimestamp(new Date().getTime());
          }}
        />
        <div className="panels">
          <div className="panel">
            <div
              className="resizer"
              onMouseUp={() => {
                const resizerWidth =
                  document.querySelector('.resizer')?.clientWidth;
                console.log('onMouseUp', resizerWidth);
                if (resizerWidth) {
                  const waterfallPanel =
                    document.querySelector('#waterfall-panel');
                  waterfallPanel?.setAttribute(
                    'style',
                    `width: ${resizerWidth}px`,
                  );
                }
              }}
            ></div>
            <div id="waterfall-panel">
              <RequestWaterfall
                key={timestamp}
                serverEvents={serverEvents.current}
              />
            </div>
          </div>
          <div className="panel">
            <RequestsTable serverEvents={serverEvents.current} />
          </div>
        </div>
      </div>
    </>
  );
}

function Header({
  serverEvents,
  setServerEvents,
}: {
  serverEvents: ServerEvents;
  setServerEvents: (serverEvents: ServerEvents) => void;
}) {
  return (
    <>
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

              setServerEvents({
                ...serverEvents,
                smallestStartTime: 0,
                mainRequests: [],
                subRequests: {},
                showPutRequests: serverEvents.showPutRequests,
              });
            }}
          >
            Clear
          </button>
          <input
            id="showPutRequests"
            type="checkbox"
            checked={serverEvents.showPutRequests}
            onChange={(event) => {
              setServerEvents({
                ...serverEvents,
                showPutRequests: event.target.checked,
              });
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
      <p style={{color: '#777', fontSize: '0.7rem', paddingLeft: '5px'}}>
        Note: You may need to turn on '<b>Disable Cache</b>' for your navigating
        window.
      </p>
    </>
  );
}

type RequestItem = {
  id: string;
  name: string;
  cacheStatus: string;
  time: number;
};
type RequestItems = RequestItem[];

function RequestsTable({serverEvents}: {serverEvents: ServerEvents}) {
  // const requests = [{
  //   id: '1',
  //   name: 'test',
  //   cacheStatus: 'MISS',
  //   time: 300,
  // }, {
  //   id: '2',
  //   name: 'test2',
  //   cacheStatus: 'HIT',
  //   time: 50,
  // }];

  const calcDuration = (time: number) => time - serverEvents.smallestStartTime;
  let requests: RequestItems = [];

  serverEvents.mainRequests.forEach((mainRequest: ServerEvent) => {
    const mainResponseStart = calcDuration(mainRequest.endTime);
    let mainResponseEnd = mainResponseStart;

    const subRequestItems: RequestItems = [];
    const subRequests = serverEvents.subRequests[mainRequest.id] || [];
    subRequests.forEach((subRequest: ServerEvent) => {
      const subRequestEnd = calcDuration(subRequest.endTime);

      if (subRequest.cacheStatus !== 'PUT') {
        mainResponseEnd = Math.max(mainResponseEnd, subRequestEnd);
      }

      const subRequestItem = {
        id: subRequest.id,
        name: subRequest.url,
        cacheStatus: subRequest.cacheStatus,
        time: subRequestEnd - calcDuration(subRequest.startTime),
      };

      if (serverEvents.showPutRequests) {
        subRequestItems.push(subRequestItem);
      } else {
        subRequest.cacheStatus !== 'PUT' &&
          subRequestItems.push(subRequestItem);
      }
    });

    requests.push({
      id: mainRequest.id,
      name: mainRequest.url,
      cacheStatus: mainRequest.cacheStatus,
      time: mainResponseEnd - calcDuration(mainRequest.startTime),
    });
    requests = requests.concat(subRequestItems);
  });

  const rowMarkup = requests.map(({id, name, cacheStatus, time}, index) => (
    <tr key={index}>
      <td>{name}</td>
      <td>{cacheStatus}</td>
      <td>{time} ms</td>
    </tr>
  ));

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Cache Status</th>
          <th>Time</th>
        </tr>
      </thead>
      {rowMarkup}
    </table>
  );
}
