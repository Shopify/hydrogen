export function loader({context} = {}) {
  if (!context?.storefront) {
    throw new Error(
      `GraphiQL: Hydrogen's storefront client must be injected in the loader context.`,
    );
  }

  const url = context.storefront.getApiUrl();
  const accessToken =
    context.storefront.getPublicTokenHeaders()[
      'X-Shopify-Storefront-Access-Token'
    ];

  return new Response(
    `
<!DOCTYPE html>
<html>
<head>
  <meta charset=utf-8/>
  <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, minimal-ui">
  <title>Shopify Storefront API</title>
  <link rel="stylesheet" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/css/index.css" />
  <link rel="shortcut icon" href="//cdn.jsdelivr.net/npm/graphql-playground-react/build/favicon.png" />
  <script src="//cdn.jsdelivr.net/npm/graphql-playground-react/build/static/js/middleware.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>window.addEventListener('load', function (event) {
    GraphQLPlayground.init(document.getElementById('root'), {
      endpoint: '${url}',
      settings:{
        'request.globalHeaders': {
          Accept: 'application/json',
          'Content-Type': 'application/graphql',
          'X-Shopify-Storefront-Access-Token': '${accessToken}'
        }
      },
      tabs: [{
        endpoint: '${url}',
        query: '{ shop { name } }'
      }]
    })
  })</script>
</body>
</html>
  `,
    {status: 200, headers: {'content-type': 'text/html'}},
  );
}
