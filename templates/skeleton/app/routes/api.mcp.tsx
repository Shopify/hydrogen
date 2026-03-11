import type {Route} from './+types/api.mcp';
import type {
  SearchProductsQuery,
  ShopPoliciesQuery,
  GetCartQuery,
  CreateCartMutation,
  AddToCartMutation,
  UpdateCartMutation,
} from 'storefrontapi.generated';

/**
 * Storefront MCP (Model Context Protocol) Server
 *
 * @see https://shopify.dev/docs/apps/build/storefront-mcp/servers/storefront
 * @see https://modelcontextprotocol.io
 */

interface ToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

interface SearchCatalogArgs {
  query: string;
  context: string;
}

interface SearchPoliciesArgs {
  query: string;
  context?: string;
}

interface GetCartArgs {
  cart_id: string;
}

interface CartLine {
  line_item_id?: string;
  merchandise_id?: string;
  quantity: number;
}

interface UpdateCartArgs {
  cart_id?: string;
  lines: CartLine[];
}

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number | null;
  method?: string;
  params?: ToolCallParams;
}

export async function action({request, context}: Route.ActionArgs) {
  try {
    const body = (await request.json()) as JsonRpcRequest;

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
        {status: 200},
      );
    }

    switch (body.method) {
      case 'tools/list':
        return handleToolsList(body.id ?? null);

      case 'tools/call':
        return handleToolsCall(body.id ?? null, body.params, context);

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
          {status: 200},
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
      {status: 200},
    );
  }
}

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
          description:
            'Update cart items or create a new cart. Set quantity to 0 to remove items.',
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
                      description:
                        'ID of existing line item (required for updates, omit for new items)',
                    },
                    merchandise_id: {
                      type: 'string',
                      description:
                        'Product variant ID (required for new items, omit for updates)',
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

async function handleToolsCall(
  id: number | string | null,
  params: unknown,
  context: Route.LoaderArgs['context'],
) {
  if (!params || typeof params !== 'object') {
    return Response.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: 'Invalid params',
        },
      },
      {status: 200},
    );
  }

  const {name, arguments: args} = params as ToolCallParams;

  try {
    switch (name) {
      case 'search_shop_catalog':
        return await searchCatalog(
          id,
          args as unknown as SearchCatalogArgs,
          context,
        );

      case 'search_shop_policies_and_faqs':
        return await searchPolicies(
          id,
          args as unknown as SearchPoliciesArgs,
          context,
        );

      case 'get_cart':
        return await getCart(id, args as unknown as GetCartArgs, context);

      case 'update_cart':
        return await updateCart(id, args as unknown as UpdateCartArgs, context);

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
          {status: 200},
        );
    }
  } catch (error) {
    return Response.json(
      {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      },
      {status: 200},
    );
  }
}

async function searchCatalog(
  id: number | string | null,
  args: SearchCatalogArgs,
  context: Route.LoaderArgs['context'],
) {
  const {query} = args;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('query must be a non-empty string');
  }

  const {products} = await context.storefront.query<SearchProductsQuery>(
    `#graphql
      query SearchProducts($query: String!, $country: CountryCode, $language: LanguageCode)
      @inContext(country: $country, language: $language) {
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
                availableForSale
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        query,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    },
  );

  const validProducts = products.nodes
    .filter((product) => product.variants.nodes.length > 0)
    .map((product) => ({
      name: product.title,
      price: product.priceRange.minVariantPrice.amount,
      currency: product.priceRange.minVariantPrice.currencyCode,
      variant_id: product.variants.nodes[0].id,
      available: product.variants.nodes[0].availableForSale,
      url: product.onlineStoreUrl ?? '',
      image_url: product.featuredImage?.url ?? '',
      description: product.description ?? '',
    }));

  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(validProducts),
        },
      ],
    },
  });
}

async function searchPolicies(
  id: number | string | null,
  args: SearchPoliciesArgs,
  context: Route.LoaderArgs['context'],
) {
  const {query} = args;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('query must be a non-empty string');
  }

  const {shop} = await context.storefront.query<ShopPoliciesQuery>(
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

  const answer = `Here are the store policies:\n\n${Object.entries(shop)
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

async function getCart(
  id: number | string | null,
  args: GetCartArgs,
  context: Route.LoaderArgs['context'],
) {
  const {cart_id} = args;

  if (!cart_id || typeof cart_id !== 'string') {
    throw new Error('cart_id is required');
  }

  const {cart} = await context.storefront.query<GetCartQuery>(
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
          text: JSON.stringify(cart),
        },
      ],
    },
  });
}

async function updateCart(
  id: number | string | null,
  args: UpdateCartArgs,
  context: Route.LoaderArgs['context'],
) {
  const {cart_id, lines} = args;

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error('lines must be a non-empty array');
  }

  for (const line of lines) {
    if (typeof line.quantity !== 'number' || line.quantity < 0) {
      throw new Error('quantity must be a non-negative number');
    }
  }

  // Create new cart if no cart_id
  if (!cart_id) {
    const {cartCreate} = await context.storefront.mutate<CreateCartMutation>(
      `#graphql
        mutation CreateCart($lines: [CartLineInput!]!) {
          cartCreate(input: {lines: $lines}) {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          lines: lines
            .filter((line) => line.merchandise_id)
            .map((line) => ({
              merchandiseId: line.merchandise_id!,
              quantity: line.quantity,
            })),
        },
      },
    );

    if (cartCreate?.userErrors && cartCreate.userErrors.length > 0) {
      throw new Error(cartCreate.userErrors.map((e) => e.message).join(', '));
    }

    return Response.json({
      jsonrpc: '2.0',
      id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify(cartCreate?.cart),
          },
        ],
      },
    });
  }

  // Update existing cart - split into add vs update
  const linesToAdd = lines.filter(
    (line) => line.merchandise_id && !line.line_item_id,
  );
  const linesToUpdate = lines.filter((line) => line.line_item_id);

  let cart = null;

  // Add new items
  if (linesToAdd.length > 0) {
    const {cartLinesAdd} = await context.storefront.mutate<AddToCartMutation>(
      `#graphql
        mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          cartId: cart_id,
          lines: linesToAdd
            .filter((line) => line.merchandise_id)
            .map((line) => ({
              merchandiseId: line.merchandise_id!,
              quantity: line.quantity,
            })),
        },
      },
    );

    if (cartLinesAdd?.userErrors && cartLinesAdd.userErrors.length > 0) {
      throw new Error(cartLinesAdd.userErrors.map((e) => e.message).join(', '));
    }

    cart = cartLinesAdd?.cart ?? null;
  }

  // Update existing items
  if (linesToUpdate.length > 0) {
    const {cartLinesUpdate} =
      await context.storefront.mutate<UpdateCartMutation>(
        `#graphql
        mutation UpdateCart($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              id
              checkoutUrl
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
        {
          variables: {
            cartId: cart_id,
            lines: linesToUpdate
              .filter((line) => line.line_item_id)
              .map((line) => ({
                id: line.line_item_id!,
                quantity: line.quantity,
              })),
          },
        },
      );

    if (cartLinesUpdate?.userErrors && cartLinesUpdate.userErrors.length > 0) {
      throw new Error(
        cartLinesUpdate.userErrors.map((e) => e.message).join(', '),
      );
    }

    cart = cartLinesUpdate?.cart ?? null;
  }

  return Response.json({
    jsonrpc: '2.0',
    id,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(cart),
        },
      ],
    },
  });
}
