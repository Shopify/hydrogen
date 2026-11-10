import {
  AnalyticsEvent,
  addAnalyticsConsoleDestination,
  getAnalytics,
} from "~/storefront/analytics";

export default defineNuxtPlugin(() => {
  const router = useRouter();

  function publishPageView() {
    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PAGE_VIEWED);
  }

  onNuxtReady(() => {
    addAnalyticsConsoleDestination();
    publishPageView();
  });
  router.afterEach(() => {
    queueMicrotask(publishPageView);
  });
});
