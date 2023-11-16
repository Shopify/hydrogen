import {type ServerEvents} from '../lib/useDebugNetworkServer.jsx';
import {Link} from '@remix-run/react';

export function RequestDetails({serverEvents}: {serverEvents: ServerEvents}) {
  if (!serverEvents.activeEventId) {
    return null;
  }

  const requestInfo = serverEvents.allRequests[serverEvents.activeEventId];

  if (!requestInfo) {
    return null;
  }

  return (
    <div id="request-detail" className="flex-row">
      {/** Tab 1 */}
      <input type="radio" name="tabset" id="tab1" defaultChecked />
      <label htmlFor="tab1" className="tab">
        Header
      </label>
      {/** Tab 2 */}
      {!!requestInfo.cache && (
        <>
          <input type="radio" name="tabset" id="tab2" />
          <label htmlFor="tab2" className="tab">
            Cache
          </label>
        </>
      )}
      {/** Tab 3 */}
      {!!requestInfo.responsePayload && (
        <>
          <input type="radio" name="tabset" id="tab3" />
          <label htmlFor="tab3" className="tab">
            Data
          </label>
        </>
      )}
      <div className="flex-break"></div>
      <div className="tabPanels">
        <div id="tab1-panel" className="tabPanel">
          <Details title="General">
            <div className="grid-layout">
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
          </Details>
          {requestInfo.responseInit?.headers && (
            <Details title="Headers">
              <div className="grid-layout">
                {Object.entries(requestInfo.responseInit?.headers).map(
                  ([key, value]) => (
                    <DetailsRow key={key} rowName={value[0]} value={value[1]} />
                  ),
                )}
              </div>
            </Details>
          )}
        </div>
        {!!requestInfo.cache && (
          <div id="tab2-panel" className="tabPanel">
            <Details title="General">
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
            </Details>
          </div>
        )}
        {!!requestInfo.responsePayload && (
          <div id="tab3-panel" className="tabPanel">
            <div className="panel">
              <pre className="code-json">
                {JSON.stringify(requestInfo.responsePayload, undefined, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Details({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="panel" open>
      <summary>{title}</summary>
      {children}
    </details>
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
      {type === 'url' && <Link to={value}>{text ?? value}</Link>}
      {type === 'string' && (
        <div className="word-break-all">{text ?? value}</div>
      )}
    </>
  );
}
