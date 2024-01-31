import {useEffect} from 'react';
import {useLocation} from '@remix-run/react';

export default function Index() {
  return (
    <>
      <h1>Partytown + Google GTM example</h1>
      <TrackPageView />
    </>
  );
}

function TrackPageView() {
  const location = useLocation();

  useEffect(() => {
    window.gtag('event', 'page_view', {path: location.pathname, title: document.title});
  }, []);

  return <pre>pageView event tracked</pre>;
}
