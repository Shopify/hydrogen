import {Carousel} from 'components/carousel';
import {ThreeItemGrid} from 'components/grid/three-items';
import Footer from 'components/layout/footer';
import {HelloWorld} from '@shopify/hydrogen-temp/react';

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
      <HelloWorld />
      <ThreeItemGrid />
      <Carousel />
      <Footer />
    </>
  );
}
