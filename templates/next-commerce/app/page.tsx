import {AnalyticsPageView} from 'components/analytics/shopify-analytics';
import {AnalyticsPageType} from '@shopify/hydrogen-react';
import {Carousel} from 'components/carousel';
import {ThreeItemGrid} from 'components/grid/three-items';
import Footer from 'components/layout/footer';
import {Suspense} from 'react';

export const metadata = {
  description:
    'High-performance ecommerce store built with Next.js, Vercel, and Shopify.',
  openGraph: {
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsPageView pageType={AnalyticsPageType.home} />
      </Suspense>
      <ThreeItemGrid />
      <Carousel />
      <Footer />
    </>
  );
}
