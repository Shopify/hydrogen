export function MockShopNotice() {
  return (
    <section className="mock-shop-notice" aria-labelledby="mock-shop-notice-heading">
      <div className="inner">
        <h2 id="mock-shop-notice-heading">Welcome to Hydrogen!</h2>
        <p>
          You&rsquo;re seeing mock.shop products because no store is connected to this project yet.
        </p>
        <p>
          mock.shop contains more than 100 sample stores. Browse the directory at{" "}
          <a href="https://mock.shop/llms.txt" target="_blank" rel="noreferrer noopener">
            mock.shop/llms.txt
          </a>{" "}
          and set <code>PUBLIC_STORE_DOMAIN</code> to a store&rsquo;s host, such as{" "}
          <code>pets.mock.shop</code>, to build against its catalog.
        </p>
        <p>
          Link a store by running <code>npx shopify hydrogen link</code> in your terminal.
        </p>
      </div>
    </section>
  );
}
