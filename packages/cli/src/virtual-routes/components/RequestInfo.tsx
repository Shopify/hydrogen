import {useState} from 'react';
import {type ServerEvents} from '../lib/useDebugNetworkServer.jsx';
import {Link} from '@remix-run/react';

export function RequestDetails({
  serverEvents,
  activeEventId,
}: {
  serverEvents: ServerEvents;
  activeEventId: string | undefined;
}) {
  const [activeTab, setActiveTab] = useState(1);

  if (!activeEventId) {
    return null;
  }

  const requestInfo = serverEvents.allRequests[activeEventId];

  if (!requestInfo) {
    return null;
  }

  function activeTabClass(tab: number) {
    return activeTab === tab ? ' active' : '';
  }

  return (
    <div id="request-detail">
      <div className="flex-row pad">
        {/** Tab 1 */}
        <button
          type="button"
          className={`tab${activeTabClass(1)}`}
          onClick={() => setActiveTab(1)}
        >
          General
        </button>
        {/** Tab 2 */}
        {!!requestInfo.responseInit?.headers && (
          <button
            type="button"
            className={`tab${activeTabClass(2)}`}
            onClick={() => setActiveTab(2)}
          >
            Header
          </button>
        )}
        {/** Tab 2 */}
        {!!requestInfo.cache && (
          <button
            type="button"
            className={`tab${activeTabClass(3)}`}
            onClick={() => setActiveTab(3)}
          >
            Cache
          </button>
        )}
        {/** Tab 3 */}
        {!!requestInfo.responsePayload && (
          <button
            type="button"
            className={`tab${activeTabClass(4)}`}
            onClick={() => setActiveTab(4)}
          >
            Data
          </button>
        )}
      </div>
      <div className="tabPanels pad">
        <div id="tab1-panel" className={`tabPanel${activeTabClass(1)}`}>
          <div className="grid-layout">
            <DetailsRow rowName="Name" value={requestInfo.displayName} />
            <DetailsRow rowName="Request URL" value={requestInfo.url} />
            <DetailsRow
              rowName="Status"
              value={`${requestInfo.responseInit?.status} ${requestInfo.responseInit?.statusText}`}
            />
            <DetailsRow
              rowName="GraphiQL"
              value={requestInfo.graphiqlLink}
              type="url"
            />
            <DetailsRow
              rowName="Location"
              text={requestInfo.stackLine}
              value={requestInfo.stackLink}
              type="url"
            />
          </div>
        </div>
        {!!requestInfo.responseInit?.headers && (
          <div id="tab2-panel" className={`tabPanel${activeTabClass(2)}`}>
            <div className="grid-layout">
                {Object.entries(requestInfo.responseInit?.headers).map(
                  ([key, value]) => (
                    <DetailsRow key={key} rowName={value[0]} value={value[1]} />
                  ),
                )}
              </div>
          </div>
        )}
        {!!requestInfo.cache && (
          <div id="tab3-panel" className={`tabPanel${activeTabClass(3)}`}>
            <div className="grid-layout">
              <DetailsRow
                rowName="Status"
                value={requestInfo.cache?.status}
              />
              <DetailsRow
                rowName="Cache-Control"
                value={requestInfo.cache?.strategy}
              />
              <DetailsRow
                rowName="Cache Key"
                value={requestInfo.cache?.key?.toString()}
              />
            </div>
          </div>
        )}
        {!!requestInfo.responsePayload && (
          <div id="tab4-panel" className={`tabPanel${activeTabClass(4)}`}>
            <pre className="code-json">
              {JSON.stringify(requestInfo.responsePayload, undefined, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailsRow({
  rowName,
  value,
  text,
  type = 'string',
}: {
  rowName: string;
  value: string | undefined;
  text?: string;
  type?: 'url' | 'string';
}) {
  if (!rowName || !value) {
    return null;
  }

  return (
    <>
      <div>{rowName}</div>
      {type === 'url' && (
        <Link target="_blank" to={value}>
          {text ?? value}
        </Link>
      )}
      {type === 'string' && (
        <div className="word-break-all">{text ?? value}</div>
      )}
    </>
  );
}
