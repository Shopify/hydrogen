import {useLoaderData} from '@remix-run/react';
import {
  type MetaFunction,
  type LoaderArgs,
  LinksFunction,
} from '@shopify/remix-oxygen';
import {type Shop} from '@shopify/storefront-kit-react/storefront-api-types';
import {Html} from '../components/Html.jsx';
import {HydrogenLogoBaseBW} from '../components/HydrogenLogoBaseBW.jsx';
import {HydrogenLogoBaseColor} from '../components/HydrogenLogoBaseColor.jsx';
import {IconDiscord} from '../components/IconDiscord.jsx';
import {IconGithub} from '../components/IconGithub.jsx';
import {IconTwitter} from '../components/IconTwitter.jsx';
import favicon from '../assets/favicon.svg';

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

export async function loader({context}: LoaderArgs) {
  const layout = await context.storefront.query<{shop: Shop}>(LAYOUT_QUERY);
  return {layout};
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  const {name: shopName} = data.layout.shop;

  const configDone = !(shopName === 'Hydrogen');

  return (
    <Html>
      <Layout shopName={shopName}>
        <section>
          {configDone ? <HydrogenLogoBaseColor /> : <HydrogenLogoBaseBW />}
          <h1>Hello, {shopName || 'Hydrogen'}</h1>
          <p>Welcome to your new custom storefront</p>
          <section className="Banner">
            <h2>Configure storefront token</h2>
            <p>
              You're seeing this because you have not yet configured your
              storefront token. To get started, edit <span>.env</span>. Learn
              more about
              {` `}
              <a href="https://shopify.dev/custom-storefronts/hydrogen/getting-started/quickstart">
                connecting a storefront
              </a>
              .
            </p>
          </section>
          <section className="Links">
            <h2>Start building</h2>
            <ul>
              <li>
                <a href="/">Collection template</a>
              </li>
              <li>
                <a href="/">Product template</a>
              </li>
              <li>
                <a href="/">Cart</a>
              </li>
            </ul>
            <h2>Resources</h2>
            <ul>
              <li>
                <a href="https://shopify.dev/custom-storefronts/hydrogen">
                  Hydrogen docs
                </a>
              </li>
              <li>
                <a href="/">Remix and project structure</a>
              </li>
              <li>
                <a href="/">Data queriers and fetching</a>
              </li>
            </ul>
          </section>
        </section>
      </Layout>
    </Html>
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
        <p>Dev Mode</p>
        <nav>
          <a href="/">
            <IconDiscord />
          </a>
          <a href="/">
            <IconGithub />
          </a>
          <a href="/">
            <IconTwitter />
          </a>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <div>
          <p>© 2023 / Shopify, Inc.</p>
        </div>
      </footer>
    </>
  );
}

const LAYOUT_QUERY = `#graphql
  query layout {
    shop {
      name
      description
    }
  }
`;
