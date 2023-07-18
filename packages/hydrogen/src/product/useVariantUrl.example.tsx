import {Link} from '@remix-run/react';
import {useVariantUrl} from '@shopify/hydrogen';

function MyComponent() {
  const {to, search} = useVariantUrl('snowboard', [
    {name: 'Color', value: 'Red'},
  ]);
  return (
    <>
      {/* The `to` property already includes search params */}
      <Link to={to}>Navigate to the snowboard</Link>

      {/* Use the `search` property for custom product routes */}
      <Link to={`/productos/snowboard${search}`}>
        Navigate to the snowboard
      </Link>
    </>
  );
}
