import { AnalyticsEvent, analyticsShop, getAnalytics } from "~/storefront/analytics";

export default defineNuxtPlugin(() => {
  const router = useRouter();

  function publishPageView() {
    const analytics = getAnalytics();
    if (!analytics) return;

    analytics.publish(AnalyticsEvent.PAGE_VIEWED, {
      url: window.location.href,
      shop: analyticsShop,
    });
  }

  onNuxtReady(publishPageView);
  router.afterEach(() => {
    queueMicrotask(publishPageView);
  });
});
