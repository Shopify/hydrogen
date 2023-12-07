import {Link} from '@remix-run/react';

export default function Homepage() {
  return (
    <div className="home">
      <h1>Example subscription</h1>
      <Link style={{textDecoration: 'underline'}} to="/products/shopify-wax">
        Shopify Wax
      </Link>
    </div>
  );
}
