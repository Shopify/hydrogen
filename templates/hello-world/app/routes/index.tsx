import {useMatches} from '@remix-run/react';
import {type MetaFunction} from '@shopify/remix-oxygen';
import {ReactNode} from 'react';
import {HydrogenLogoBaseBW, HydrogenLogoBaseColor} from '~/images';

export const meta: MetaFunction = () => {
  return {
    title: 'Hydrogen',
    description: 'A custom storefront powered by Hydrogen',
  };
};

export default function Index() {
  const [root] = useMatches();

  const configDone = !(root.data.layout.shop.name === 'Hydrogen');

  return (
    <div className="Index">
      {configDone ? <HydrogenLogoBaseColor /> : <HydrogenLogoBaseBW />}
      <h1>Hello, {root.data.layout.shop.name}</h1>
      <p>Welcome to your new custom storefront</p>
      <div className="Banner">
        <h2>Configure storefront token</h2>
        <p>
          You’re seeing this because you have not yet configured your storefront
          token. To get started, edit <span>.env</span>. Learn more about
          {` `}
          <a href="https://shopify.dev/custom-storefronts/hydrogen/getting-started/quickstart">
            connecting a storefront
          </a>
          .
        </p>
      </div>
      <section className="Links">
        <h2>Start building</h2>
        <ul>
          <li>
            <a href="/">Collection template</a>
          </li>
          <li>
            <a href="/">Product template</a>
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
    </div>
  );
}
