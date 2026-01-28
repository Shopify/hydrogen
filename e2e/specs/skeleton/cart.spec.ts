import {ProductVariant} from '@shopify/hydrogen/storefront-api-types';
import {setTestStore, test, expect} from '../../fixtures';
import {CART_QUERY_FRAGMENT} from '../../../templates/skeleton/app/lib/fragments';

setTestStore('hydrogenPreviewStorefront');

test.describe('Cart', () => {
  test('Supports nested line items', async ({page, storefront, request}) => {
    const cartId = await storefront.getCartId();
    expect(cartId).not.toBeDefined();

    const products = await request
      .post('api/2025-10/graphql.json', {
        data: {
          query: `query productsWithVariants {
          products(first:2){
            nodes {
              title
              variants(first: 10){
                nodes {
                  title
                  id
                }
              }
            }
          }
        }`,
        },
      })
      .then((response) => response.json());

    const firstProduct = products.data.products.nodes[0]
      ? {
          title: products.data.products.nodes[0].title,
          firstVariant: products.data.products.nodes[0].variants.nodes[0],
        }
      : undefined;
    const secondProduct = products.data.products.nodes[1]
      ? {
          title: products.data.products.nodes[1].title,
          firstVariant: products.data.products.nodes[1].variants.nodes[0],
        }
      : undefined;

    expect(firstProduct).toBeDefined();
    expect(secondProduct).toBeDefined();

    const addedLines = await request
      .post('api/2025-10/graphql.json', {
        data: {
          query: `mutation createCartWithNested($lines: [CartLineInput!]!) {
            cartCreate(input: {lines: $lines}) {
              userErrors {
                code
                message
              }
              warnings {code, message}
              cart {
                id
                lines(first: 10) {
                  nodes {
                    id
                    ...on CartLine {
                      parentRelationship {
                        parent {
                          id
                        }
                      }
                    }
                  }
                }
              }
            }
          }
`,
          variables: {
            lines: [
              {
                merchandiseId: firstProduct?.firstVariant.id,
                quantity: 1,
              },
              {
                merchandiseId: secondProduct?.firstVariant.id,
                quantity: 1,
                parent: {
                  merchandiseId: firstProduct?.firstVariant.id,
                },
              },
            ],
          },
        },
      })
      .then((response) => response.json());

    expect(addedLines.data.cartCreate.cart.id).toBeDefined();
    expect(addedLines.data.cartCreate.userErrors).toHaveLength(0);
    expect(addedLines.data.cartCreate.cart.lines.nodes).toHaveLength(2);
    expect(
      addedLines.data.cartCreate.cart.lines.nodes[0].parentRelationship,
    ).toBeNull();
    expect(
      addedLines.data.cartCreate.cart.lines.nodes[1].parentRelationship,
    ).not.toBeNull();

    await page.goto('/');
    await storefront.setCartId(addedLines.data.cartCreate.cart.id);

    await page.goto('/cart');

    const lineItems = await page
      .getByRole('list', {name: 'Line items'})
      .getByRole('listitem')
      .all();

    /** verify if the first product is there */
    const firstProductLocator = lineItems[0].getByRole('link', {
      name: firstProduct?.title,
    });
    await expect(firstProductLocator).toBeVisible();

    const nestedLineItems = lineItems[0].getByRole('list', {
      name: `Line items with ${firstProduct?.title}`,
    });
    await expect(nestedLineItems).toBeVisible();

    const nestedProductLocator = nestedLineItems.getByRole('link', {
      name: secondProduct?.title,
    });
    await expect(nestedProductLocator).toBeVisible();
  });
});
