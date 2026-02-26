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
          Link a store by running <code>npx shopify hydrogen link</code> in your
          terminal.
        </p>
      </div>
    </section>
  );
}
