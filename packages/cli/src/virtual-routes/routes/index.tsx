import {useLoaderData} from '@remix-run/react';
import {type MetaFunction, LinksFunction} from '@shopify/remix-oxygen';
import {type Shop} from '@shopify/hydrogen-react/storefront-api-types';
import {HydrogenLogoBaseBW} from '../components/HydrogenLogoBaseBW.jsx';
import {HydrogenLogoBaseColor} from '../components/HydrogenLogoBaseColor.jsx';
import {IconDiscord} from '../components/IconDiscord.jsx';
import {IconGithub} from '../components/IconGithub.jsx';
import {IconTwitter} from '../components/IconTwitter.jsx';
import {IconBanner} from '../components/IconBanner.jsx';
import {IconError} from '../components/IconError.jsx';
import favicon from '../assets/favicon.svg';
import type {I18nBase, StorefrontClient} from '@shopify/hydrogen';

interface AppLoadContext {
  storefront: StorefrontClient<I18nBase>['storefront'];
}

export const meta: MetaFunction = () => {
  return {
    title: 'Hydrogen',
    description: 'A custom storefront powered by Hydrogen',
    charset: 'utf-8',
    viewport: 'width=device-width,initial-scale=1',
  };
};

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    type: 'image/svg+xml',
    href: favicon,
  },
];

export async function loader({context}: {context: AppLoadContext}) {
  const layout = await context.storefront.query<{shop: Shop}>(LAYOUT_QUERY);
  return {layout};
}

export const HYDROGEN_SHOP_ID = 'gid://shopify/Shop/55145660472';

export function CatchBoundary() {
  return <ErrorPage />;
}

export function ErrorBoundary() {
  return <ErrorPage />;
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  const {name: shopName, id: shopId} = data.layout.shop;

  const configDone = shopId !== HYDROGEN_SHOP_ID;

  return (
    <>
      <Layout shopName={shopName}>
        {configDone ? <HydrogenLogoBaseColor /> : <HydrogenLogoBaseBW />}
        <h1>Hello, {shopName || 'Hydrogen'}</h1>
        <p>Welcome to your new custom storefront</p>
        <section className="Banner">
          <div>
            <IconBanner />
            <h2>Configure storefront token</h2>
          </div>
          <p>
            You&rsquo;re seeing this because you have not yet configured your
            storefront token. To get started, edit {` `}
            <code>.env</code>. Then, create your first route with the file {` `}
            <code>/app/routes/index.jsx</code>. Learn more about
            {` `}
            <a href="https://shopify.dev/custom-storefronts/hydrogen/getting-started/quickstart">
              connecting a&nbsp;storefront
            </a>
            .
          </p>
        </section>
        <ResourcesLinks />
      </Layout>
    </>
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
            Check your domain and API token in your <code>.env</code> file. Read
            the documentation on{` `}
            <a
              target="_blank"
              rel="norefferer noopener"
              href="https://shopify.dev/custom-storefronts/hydrogen/getting-started/quickstart"
            >
              how to configure your&nbsp;storefront
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
          <a href="https://discord.com/invite/shopifydevs">
            <IconDiscord />
          </a>
          <a href="https://github.com/Shopify/hydrogen">
            <IconGithub />
          </a>
          <a href="https://twitter.com/shopifydevs?lang=en">
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
