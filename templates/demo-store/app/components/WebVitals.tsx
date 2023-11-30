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

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log(entry);
      });
    });
    observer.observe({ type: 'event', buffered: true, durationThreshold:40 });
  }, []);

  return null;
}
