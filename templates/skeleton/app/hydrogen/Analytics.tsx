import React, {
  useEffect,
  useRef,
  createContext,
  useState,
  useContext,
} from 'react';

const AnalyticsContext = createContext({
  userConsent: false,
  setUserConsent: (value: boolean) => value,
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function AnalyticsProvider({
  children,
  userConsent: userConsentProp,
}: {
  children: any;
  userConsent: () => boolean;
}) {
  const [userConsent, setUserConsent] = useState(userConsentProp());
  return (
    <AnalyticsContext.Provider value={{userConsent, setUserConsent}}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function Analytics() {
  return null;
}

function PageView<Page>({
  page,
  onPageView,
}: {
  page: Page;
  onPageView?: (payload: any) => void;
}) {
  const {userConsent} = useAnalytics();
  const lastHandle = useRef<string | null>(null);

  // TODO: need to check wether the user consented or not before sending the page view
  useEffect(() => {
    if (!userConsent) return;
    // TODO: send shopify analytics event

    if (!page) {
      console.error('PageView: page is required');
      // TODO: add zod validation for trekkie required fields
      return;
    }

    // @ts-ignore
    if (page?.handle === lastHandle.current) return;
    lastHandle.current = page.handle;

    if (!onPageView) return;
    onPageView(page);
    // @ts-ignore
  }, [onPageView, page, page?.handle, userConsent]);
  return null;
}

function CollectionView<Collection>({
  collection,
  onCollectionView,
}: {
  collection: Collection;
  onCollectionView?: (payload: any) => void;
}) {
  const {userConsent} = useAnalytics();
  const lastHandle = useRef<string | null>(null);

  useEffect(() => {
    if (!userConsent) return;

    if (!collection) {
      console.error('CollectionView: collection is required');
      return;
    }

    if (collection?.handle === lastHandle.current) return;
    lastHandle.current = collection.handle;

    if (!onCollectionView) return;
    onCollectionView(collection);
  }, [onCollectionView, collection?.handle, userConsent]);
  return null;
}

function ProductView<Product>({
  product,
  onProductView,
}: {
  product: Product;
  onProductView?: (payload: any) => void;
}) {
  const {userConsent} = useAnalytics();
  const lastHandle = useRef<string | null>(null);

  useEffect(() => {
    if (!userConsent) return;

    if (!product) {
      console.error('ProductView: product is required');
      // TODO: add zod validation for trekkie required fields
      return;
    }

    // already emitted this product view
    if (product?.handle === lastHandle.current) return;

    // save the last handle
    lastHandle.current = product.handle;

    // emit shopify analytics event
    console.log('Shopify:ProductView', product);

    // Optionally emit the event for 3P analytics
    if (!onProductView) return;
    onProductView(product);
    // @ts-ignore
  }, [onProductView, product?.handle, userConsent]);
  return null;
}

Analytics.Provider = AnalyticsProvider;
Analytics.PageView = PageView;
Analytics.ProductView = ProductView;
Analytics.CollectionView = CollectionView;
