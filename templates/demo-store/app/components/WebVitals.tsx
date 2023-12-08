import {useEffect} from 'react';
import type {CLSMetric, INPMetric, LCPMetric} from 'web-vitals';

export default function WebVitals() {


  useEffect(() => {
    async function loadWebVitals (cb: (module: typeof import('web-vitals')) => void) {
      return await import('web-vitals').then((module) => cb(module));
    }

    function onReport(msg: string) {
      return (data: INPMetric | LCPMetric | CLSMetric) => {
        // const softNavEntry = performance.getEntriesByType('soft-navigation').filter(
        //   // @ts-ignore
        //   (navEntry) => navEntry.navigationId === data.navigationId
        // )[0];
        console.log(msg, data);

        // if(softNavEntry) {
        //   console.log(msg, softNavEntry);
        // }
      };
    }

    loadWebVitals((webVitals) => {
      webVitals.onINP(onReport('INP'), {reportSoftNavs: true, reportAllChanges: true});
      webVitals.onLCP(onReport('LCP'), {reportSoftNavs: true});
      // webVitals.onCLS(onReport('CLS'), {reportSoftNavs: true});
    });

    // Report all available metrics whenever the page is backgrounded or unloaded.
    addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('visibilitychange', document.visibilityState);
      }
    });

    // NOTE: Safari does not reliably fire the `visibilitychange` event when the
    // page is being unloaded. If Safari support is needed, you should also flush
    // the queue in the `pagehide` event.
    addEventListener('pagehide', () => {
      console.log('pagehide', document.visibilityState);
    });
  }, []);

  return null;
}
