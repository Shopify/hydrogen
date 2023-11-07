import {useLoaderData} from '@remix-run/react';
import type {LinksFunction} from '@remix-run/server-runtime';
import type {Shop} from '@shopify/hydrogen-react/storefront-api-types';
import {HydrogenLogoBaseBW} from '../components/HydrogenLogoBaseBW.jsx';
import {HydrogenLogoBaseColor} from '../components/HydrogenLogoBaseColor.jsx';
import {IconDiscord} from '../components/IconDiscord.jsx';
import {IconGithub} from '../components/IconGithub.jsx';
import {IconTwitter} from '../components/IconTwitter.jsx';
import {IconBanner} from '../components/IconBanner.jsx';
import {IconError} from '../components/IconError.jsx';
import favicon from '../assets/favicon.svg';
import interVariableFontWoff2 from '../assets/inter-variable-font.woff2';
import jetbrainsmonoVariableFontWoff2 from '../assets/jetbrainsmono-variable-font.woff2';
import type {I18nBase, StorefrontClient} from '@shopify/hydrogen';

interface AppLoadContext {
  storefront: StorefrontClient<I18nBase>['storefront'];
}

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    type: 'image/svg+xml',
    href: favicon,
  },
  {
    rel: 'preload',
    href: interVariableFontWoff2,
    as: 'font',
    type: 'font/ttf',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: jetbrainsmonoVariableFontWoff2,
    as: 'font',
    type: 'font/ttf',
    crossOrigin: 'anonymous',
  },
];

export async function loader({
  context: {storefront},
}: {
  context: AppLoadContext;
}) {
  const layout = await storefront.query<{shop: Shop}>(LAYOUT_QUERY);
  return {layout, isMockShop: storefront.getApiUrl().includes('mock.shop')};
}

export const HYDROGEN_SHOP_ID = 'gid://shopify/Shop/55145660472';

export function ErrorBoundary() {
  return <ErrorPage />;
}

export default function Index() {
  const {
    isMockShop,
    layout: {shop},
  } = useLoaderData<typeof loader>();

  let {name: shopName, id: shopId} = shop;

  const configDone = shopId !== HYDROGEN_SHOP_ID && !isMockShop;
  if (isMockShop || !shopName) shopName = 'Hydrogen';

  return (
    <>
      <Layout shopName={shopName}>
        {configDone ? <HydrogenLogoBaseColor /> : <HydrogenLogoBaseBW />}
        <h1>Hello, {shopName}</h1>
        <p>Welcome to your new custom storefront</p>

        <section className="Banner">
          <div>
            <IconBanner />
            <h2>
              {configDone
                ? 'Create your first route'
                : 'Configure storefront token'}
            </h2>
          </div>
          {configDone ? (
            <p>
              You&rsquo;re seeing this because you don&rsquo;t have a home route
              in your project yet. <br />
              Run <code>h2 setup</code> to scaffold standard Shopify routes.
              Learn more about
              {` `}
              <CreateRoutesLink />
            </p>
          ) : (
            <p>
              You&rsquo;re seeing this because you have not yet configured your
              storefront token. <br />
              <br /> To link your store,{` `}
              run <code>h2 link && h2 env pull</code>. Then, run{' '}
              <code>h2 setup</code> to scaffold standard Shopify routes.
              <br />
              Learn more about
              {` `}
              <a
                target="_blank"
                rel="norefferer noopener"
                href="https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables"
              >
                editing environment variables
              </a>
              {` `}
              and{` `}
              <CreateRoutesLink />.
            </p>
          )}
        </section>
        <ResourcesLinks />
      </Layout>
    </>
  );
}

function CreateRoutesLink() {
  return (
    <a
      target="_blank"
      rel="norefferer noopener"
      href="https://shopify.dev/docs/custom-storefronts/hydrogen/building/begin-development#step-4-create-a-route"
    >
      creating routes
    </a>
  );
}

function ErrorPage() {
  return (
    <>
      <Layout shopName="Hydrogen">
        <HydrogenLogoBaseBW />
        <h1>Hello, Hydrogen</h1>
        <p>Welcome to your new custom storefront</p>
        <section className="Banner ErrorBanner">
          <div>
            <IconError />
            <h2>There&rsquo;s a problem with your storefront</h2>
          </div>
          <p>
            Check your domain and API token in your <code>.env</code> file.
            Learn more about{` `}
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables"
            >
              editing environment variables
            </a>
            .
          </p>
        </section>
        <ResourcesLinks />
      </Layout>
    </>
  );
}

function ResourcesLinks() {
  return (
    <>
      <section className="Links">
        <h2>Start building</h2>
        <ul>
          <li>
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen/building/collection-page"
            >
              Collection template
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen/building/product-details-page"
            >
              Product template
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen/building/cart"
            >
              Cart
            </a>
          </li>
        </ul>
        <h2>Resources</h2>
        <ul>
          <li>
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen"
            >
              Hydrogen docs
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen/project-structure"
            >
              Remix and project structure
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen/data-fetching/fetch-data"
            >
              Data queries and fetching
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}

function Layout({
  shopName,
  children,
}: {
  shopName: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header>
        <h1>{shopName?.toUpperCase()}</h1>
        <p>&nbsp;Dev Mode&nbsp;</p>
        <nav>
          <a
            target="_blank"
            rel="norefferer noopener"
            href="https://discord.com/invite/shopifydevs"
          >
            <IconDiscord />
          </a>
          <a
            target="_blank"
            rel="norefferer noopener"
            href="https://github.com/Shopify/hydrogen"
          >
            <IconGithub />
          </a>
          <a
            target="_blank"
            rel="norefferer noopener"
            href="https://twitter.com/shopifydevs?lang=en"
          >
            <IconTwitter />
          </a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div>
          <a
            href="https://shopify.com"
            target="_blank"
            rel="noreferrer noopener"
          >
            Powered by Shopify
          </a>
        </div>
      </footer>
    </>
  );
}

const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      id
    }
  }
`;
