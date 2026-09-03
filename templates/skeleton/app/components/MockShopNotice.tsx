export function MockShopNotice() {
  return (
    <section
      className="mock-shop-notice"
      aria-labelledby="mock-shop-notice-heading"
    >
      <div className="inner">
        <h2 id="mock-shop-notice-heading">Welcome to Hydrogen!</h2>
        <p>
          You&rsquo;re seeing mocked products because no store is connected to
          this project yet.
        </p>
        <p>
          These products come from the default mock.shop store. Other mock
          stores are listed at{' '}
          <a href="https://mock.shop/llms.txt">mock.shop/llms.txt</a>; set{' '}
          <code>PUBLIC_STORE_DOMAIN</code> in <code>.env</code> to one of their
          hosts to use it.
        </p>
        <p>
          Link a store by running <code>npx shopify hydrogen link</code> in your
          terminal.
        </p>
      </div>
    </section>
  );
}
