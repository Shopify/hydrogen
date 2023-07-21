import React, {useEffect} from 'react';
import {useLoadScript} from '@shopify/hydrogen-react';

export default function Homepage() {
  const scriptStatus = useLoadScript('https://some-cdn.com/some-script.js');

  useEffect(() => {
    if (scriptStatus === 'done') {
      // do something
    }
  }, [scriptStatus]);

  return <div>{scriptStatus === 'done' && <p>Script loaded!</p>}</div>;
}
