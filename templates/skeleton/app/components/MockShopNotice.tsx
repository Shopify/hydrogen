export function MockShopNotice() {
  return (
    <section
      className="mock-shop-notice"
      aria-labelledby="mock-shop-notice-heading"
    >
      <p id="mock-shop-notice-heading">
        Welcome to hydrogen! This is a mock shop.
      </p>
      <p>
        You&rsquo;re seeing mocked products because no store is connected to
        this project yet.
      </p>
      <p>
        Link a store by running <code>npx shopify hydrogen link</code> in your
        project.
      </p>
      <p>
        Need help? Learn more about{' '}
        <a
          className="link"
          target="_blank"
          rel="noreferrer noopener"
          href="https://shopify.dev/docs/custom-storefronts/hydrogen/environment-variables"
        >
          editing environment variables
        </a>
        .
      </p>
    </section>
  );
}
