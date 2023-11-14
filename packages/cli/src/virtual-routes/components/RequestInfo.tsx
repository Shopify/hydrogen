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
      <input type="radio" name="tabset" id="tab2" />
      <label htmlFor="tab2" className="tab">
        Cache
      </label>
      <div className="flex-break"></div>
      <div className="tabPanels">
        <div id="tab1-panel" className="tabPanel">
          <Details title="General">
            <div className="grid-layout">
              <DetailsRow rowName="Request URL" value={requestInfo.url} />
              <DetailsRow
                rowName="GraphiQL"
                value={requestInfo.graphiqlLink}
                type="url"
              />
              <DetailsRow
                rowName="GraphiQL"
                value={requestInfo.graphiqlLink}
                type="url"
              />
              <DetailsRow
                rowName="GraphiQL"
                value={requestInfo.graphiqlLink}
                type="url"
              />
              <DetailsRow
                rowName="GraphiQL"
                value={requestInfo.graphiqlLink}
                type="url"
              />
            </div>
          </Details>
          <Details title="Headers">
            <div className="grid-layout">
              <DetailsRow rowName="Request URL" value={requestInfo.url} />
              <DetailsRow
                rowName="GraphiQL"
                value={requestInfo.graphiqlLink}
                type="url"
              />
            </div>
          </Details>
        </div>
        <div id="tab2-panel" className="tabPanel">
          <Details title="General">
            <div className="grid-layout">
              <DetailsRow rowName="Status" value={requestInfo.cacheStatus} />
            </div>
          </Details>
        </div>
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
  type = 'string',
}: {
  rowName: string;
  value: string | undefined;
  type?: 'url' | 'string';
}) {
  if (!rowName || !value) {
    return null;
  }

  return (
    <>
      <div>{rowName}</div>
      {type === 'url' && <Link to={value}>{value}</Link>}
      {type === 'string' && <div>{value}</div>}
    </>
  );
}
