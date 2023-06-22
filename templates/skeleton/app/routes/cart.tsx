import {Await, useMatches, Link} from '@remix-run/react';
import {Suspense} from 'react';
import {flattenConnection} from '@shopify/hydrogen';
import type {CartFragment} from 'storefrontapi.generated';

export async function action() {
  // TODO: implement cart action
}

export default function Cart() {
  const [root] = useMatches();

  return (
    <section className="cart">
      <Suspense fallback="loading">
        <Await
          errorElement={<div>An error occurred</div>}
          resolve={root.data?.cart as Promise<CartFragment>}
        >
          {(cart) => {
            if (!cart || !cart.lines.edges.length) {
              return <CartEmpty />;
            }
            return (
              <>
                <h1>Cart</h1>
                <CartLines lines={cart.lines} />
              </>
            );
          }}
        </Await>
      </Suspense>
    </section>
  );
}

function CartEmpty() {
  return (
    <>
      <p>Looks like you haven&rsquo;t added anything to your cart.</p>
      <Link prefetch="intent" to="/collections">
        Browse our collections <symbol>→</symbol>
      </Link>
    </>
  );
}

function CartLines({lines}: Pick<CartFragment, 'lines'>) {
  const cartLines = lines ? flattenConnection(lines) : [];
  return (
    <ul>
      {cartLines.map((line) => (
        <div key={line.id}>
          <h2>{line.merchandise.title}</h2>
        </div>
      ))}
    </ul>
  );
}
