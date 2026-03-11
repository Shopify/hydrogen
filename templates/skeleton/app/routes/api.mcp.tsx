import type {Route} from './+types/api.mcp';

/**
 * Storefront MCP (Model Context Protocol) Server
 *
 * This endpoint implements the MCP specification to enable AI agents
 * to interact with the storefront. It provides tools for:
 * - Product search
 * - Cart management
 * - Store policies and FAQs
 *
 * @see https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront
 * @see https://modelcontextprotocol.io
 */
export async function action({request, context}: Route.ActionArgs) {
  try {
    const body = await request.json();

    // Validate JSON-RPC 2.0 format
    if (body.jsonrpc !== '2.0') {
      return Response.json(
        {
          jsonrpc: '2.0',
          id: body.id ?? null,
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be "2.0"',
          },
        },
        {status: 400},
      );
    }

    // Handle MCP methods
    switch (body.method) {
      case 'tools/list':
        return handleToolsList(body.id);

      case 'tools/call':
        return handleToolsCall(body.id, body.params, context);

      default:
        return Response.json(
          {
            jsonrpc: '2.0',
            id: body.id ?? null,
            error: {
              code: -32601,
              message: `Method not found: ${body.method}`,
            },
          },
          {status: 404},
        );
    }
  } catch (error) {
    return Response.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      },
      {status: 400},
    );
  }
}

/**
 * Handle tools/list - Returns available MCP tools
 */
function handleToolsList(id: number | string | null) {
  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      tools: [
        {
          name: 'search_shop_catalog',
          description:
            "Search the store's product catalog to find items that match customer needs",
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to find related products',
              },
              context: {
                type: 'string',
                description: 'Additional information to help tailor results',
              },
            },
            required: ['query', 'context'],
          },
        },
        {
          name: 'search_shop_policies_and_faqs',
          description:
            'Answer questions about store policies, products, and services',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The question about policies or FAQs',
              },
              context: {
                type: 'string',
                description: 'Additional context like current product',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_cart',
          description: 'Retrieve the current contents of a cart',
          inputSchema: {
            type: 'object',
            properties: {
              cart_id: {
                type: 'string',
                description: 'ID of an existing cart',
              },
            },
            required: ['cart_id'],
          },
        },
        {
          name: 'update_cart',
          description: 'Update cart items or create a new cart',
          inputSchema: {
            type: 'object',
            properties: {
              cart_id: {
                type: 'string',
                description:
                  'ID of the cart to update (creates new if not provided)',
              },
              lines: {
                type: 'array',
                description: 'Array of items to update or add',
                items: {
                  type: 'object',
                  properties: {
                    line_item_id: {
                      type: 'string',
                      description: 'ID of existing line item (for updates)',
                    },
                    merchandise_id: {
                      type: 'string',
                      description: 'Product variant ID',
                    },
                    quantity: {
                      type: 'number',
                      description: 'Item quantity (0 to remove)',
                    },
                  },
                  required: ['quantity'],
                },
              },
            },
            required: ['lines'],
          },
        },
      ],
    },
  });
}

/**
 * Handle tools/call - Execute a specific tool
 */
async function handleToolsCall(
  id: number | string | null,
  params: any,
  context: Route.LoaderArgs['context'],
) {
  const {name, arguments: args} = params;

  try {
    switch (name) {
      case 'search_shop_catalog':
        return await searchCatalog(id, args, context);

      case 'search_shop_policies_and_faqs':
        return await searchPolicies(id, args, context);

      case 'get_cart':
        return await getCart(id, args, context);

      case 'update_cart':
        return await updateCart(id, args, context);

      default:
        return Response.json(
          {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: `Unknown tool: ${name}`,
            },
          },
          {status: 400},
        );
    }
  } catch (error) {
    return Response.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      },
      {status: 500},
    );
  }
}

/**
 * Search product catalog
 */
async function searchCatalog(
  id: number | string | null,
  args: {query: string; context: string},
  context: Route.LoaderArgs['context'],
) {
  const {query} = args;

  // Use Storefront API to search products
  const {data} = await context.storefront.query(
    `#graphql
      query SearchProducts($query: String!) {
        products(first: 10, query: $query) {
          nodes {
            id
            title
            description
            onlineStoreUrl
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
            }
            variants(first: 1) {
              nodes {
                id
              }
            }
          }
        }
      }
    `,
    {variables: {query}},
  );

  const products = data?.products?.nodes || [];

  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            products.map((product: any) => ({
              name: product.title,
              price: product.priceRange.minVariantPrice.amount,
              currency: product.priceRange.minVariantPrice.currencyCode,
              variant_id: product.variants.nodes[0]?.id,
              url: product.onlineStoreUrl,
              image_url: product.featuredImage?.url,
              description: product.description,
            })),
          ),
        },
      ],
    },
  });
}

/**
 * Search store policies and FAQs
 */
async function searchPolicies(
  id: number | string | null,
  args: {query: string; context?: string},
  context: Route.LoaderArgs['context'],
) {
  // Query shop policies
  const {data} = await context.storefront.query(
    `#graphql
      query ShopPolicies {
        shop {
          privacyPolicy {
            title
            body
          }
          refundPolicy {
            title
            body
          }
          shippingPolicy {
            title
            body
          }
          termsOfService {
            title
            body
          }
        }
      }
    `,
  );

  const policies = data?.shop || {};
  const answer = `Here are the store policies:\n\n${Object.entries(policies)
    .filter(([_, value]) => value)
    .map(([key, value]: [string, any]) => `${value.title}: ${value.body}`)
    .join('\n\n')}`;

  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: answer,
        },
      ],
    },
  });
}

/**
 * Get cart contents
 */
async function getCart(
  id: number | string | null,
  args: {cart_id: string},
  context: Route.LoaderArgs['context'],
) {
  const {cart_id} = args;

  const {data} = await context.storefront.query(
    `#graphql
      query GetCart($cartId: ID!) {
        cart(id: $cartId) {
          id
          checkoutUrl
          lines(first: 100) {
            nodes {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product {
                    title
                  }
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    `,
    {variables: {cartId: cart_id}},
  );

  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data?.cart),
        },
      ],
    },
  });
}

/**
 * Update cart (add/remove/update items)
 */
async function updateCart(
  id: number | string | null,
  args: {cart_id?: string; lines: any[]},
  context: Route.LoaderArgs['context'],
) {
  const {cart_id, lines} = args;

  // If no cart_id, create a new cart
  if (!cart_id) {
    const {data} = await context.storefront.mutate(
      `#graphql
        mutation CreateCart($lines: [CartLineInput!]!) {
          cartCreate(input: {lines: $lines}) {
            cart {
              id
              checkoutUrl
            }
          }
        }
      `,
      {
        variables: {
          lines: lines.map((line) => ({
            merchandiseId: line.merchandise_id,
            quantity: line.quantity,
          })),
        },
      },
    );

    return Response.json({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data?.cartCreate?.cart),
          },
        ],
      },
    });
  }

  // Update existing cart
  const {data} = await context.storefront.mutate(
    `#graphql
      mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
        cartLinesUpdate(cartId: $cartId, lines: $lines) {
          cart {
            id
            checkoutUrl
          }
        }
      }
    `,
    {
      variables: {
        cartId: cart_id,
        lines: lines.map((line) => ({
          id: line.line_item_id,
          quantity: line.quantity,
        })),
      },
    },
  );

  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data?.cartLinesUpdate?.cart),
        },
      ],
    },
  });
}
