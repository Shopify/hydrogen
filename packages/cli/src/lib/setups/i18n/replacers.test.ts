import {fileURLToPath} from 'node:url';
import {describe, it, expect} from 'vitest';
import {
  inTemporaryDirectory,
  copyFile,
  readFile,
  writeFile,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {ts} from 'ts-morph';
import {getSkeletonSourceDir} from '../../build.js';
import {
  replaceI18nCartPath,
  replaceRemixEnv,
  replaceServerI18n,
} from './replacers.js';
import {DEFAULT_COMPILER_OPTIONS} from '../../transpile/morph/index.js';

const remixDts = 'remix.env.d.ts';
const serverTs = 'server.ts';
const rootTsx = 'app/root.tsx';
const cartTsx = 'app/components/Cart.tsx';
const addToCartButtonTsx = 'app/components/AddToCartButton.tsx';

const checkTypes = (content: string) => {
  const {diagnostics} = ts.transpileModule(content, {
    reportDiagnostics: true,
    compilerOptions: DEFAULT_COMPILER_OPTIONS,
  });

  if (diagnostics && diagnostics.length > 0) {
    throw new Error(
      ts.formatDiagnostics(
        diagnostics,
        ts.createCompilerHost(DEFAULT_COMPILER_OPTIONS),
      ),
    );
  }
};

describe('i18n replacers', () => {
  it('adds i18n type to remix.env.d.ts', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonDir = getSkeletonSourceDir();
      await copyFile(
        joinPath(skeletonDir, remixDts),
        joinPath(tmpDir, remixDts),
      );

      await replaceRemixEnv(
        {rootDirectory: tmpDir},
        {},
        await readFile(
          fileURLToPath(new URL('./templates/domains.ts', import.meta.url)),
        ),
      );

      const newContent = await readFile(joinPath(tmpDir, remixDts));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "/// <reference types="@remix-run/dev" />
        /// <reference types="@shopify/remix-oxygen" />
        /// <reference types="@shopify/oxygen-workers-types" />

        // Enhance TypeScript's built-in typings.
        import "@total-typescript/ts-reset";

        import type {
          Storefront,
          CustomerAccount,
          HydrogenCart,
        } from "@shopify/hydrogen";
        import type {
          LanguageCode,
          CountryCode,
        } from "@shopify/hydrogen/storefront-api-types";
        import type { AppSession } from "~/lib/session";

        declare global {
          /**
           * A global \`process\` object is only available during build to access NODE_ENV.
           */
          const process: { env: { NODE_ENV: "production" | "development" } };

          /**
           * Declare expected Env parameter in fetch handler.
           */
          interface Env {
            SESSION_SECRET: string;
            PUBLIC_STOREFRONT_API_TOKEN: string;
            PRIVATE_STOREFRONT_API_TOKEN: string;
            PUBLIC_STORE_DOMAIN: string;
            PUBLIC_STOREFRONT_ID: string;
            PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: string;
            PUBLIC_CUSTOMER_ACCOUNT_API_URL: string;
          }

          /**
           * The I18nLocale used for Storefront API query context.
           */
          type I18nLocale = { language: LanguageCode; country: CountryCode };
        }

        declare module "@shopify/remix-oxygen" {
          /**
           * Declare local additions to the Remix loader context.
           */
          export interface AppLoadContext {
            env: Env;
            cart: HydrogenCart;
            storefront: Storefront<I18nLocale>;
            customerAccount: CustomerAccount;
            session: AppSession;
            waitUntil: ExecutionContext["waitUntil"];
          }
        }
        "
      `);
    });
  });

  it('adds i18n type to server.ts', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonDir = getSkeletonSourceDir();

      await writeFile(
        joinPath(tmpDir, serverTs),
        // Remove the part that is not needed for this test (AppSession, Cart query, etc);
        (
          await readFile(joinPath(skeletonDir, serverTs))
        ).replace(/^};$.*/ms, '};'),
      );

      await replaceServerI18n(
        {rootDirectory: tmpDir, serverEntryPoint: serverTs},
        {},
        await readFile(
          fileURLToPath(new URL('./templates/domains.ts', import.meta.url)),
        ),
        false,
      );

      const newContent = await readFile(joinPath(tmpDir, serverTs));
      expect(() => checkTypes(newContent)).not.toThrow();

      expect(newContent).toMatchInlineSnapshot(`
        "// Virtual entry point for the app
        import * as remixBuild from "@remix-run/dev/server-build";
        import {
          cartGetIdDefault,
          cartSetIdDefault,
          createCartHandler,
          createStorefrontClient,
          storefrontRedirect,
          createCustomerAccountClient,
        } from "@shopify/hydrogen";
        import {
          createRequestHandler,
          getStorefrontHeaders,
          type AppLoadContext,
        } from "@shopify/remix-oxygen";
        import { AppSession } from "~/lib/session";
        import { CART_QUERY_FRAGMENT } from "~/lib/fragments";

        /**
         * Export a fetch handler in module format.
         */
        export default {
          async fetch(
            request: Request,
            env: Env,
            executionContext: ExecutionContext
          ): Promise<Response> {
            try {
              /**
               * Open a cache instance in the worker and a custom session instance.
               */
              if (!env?.SESSION_SECRET) {
                throw new Error("SESSION_SECRET environment variable is not set");
              }

              const waitUntil = executionContext.waitUntil.bind(executionContext);
              const [cache, session] = await Promise.all([
                caches.open("hydrogen"),
                AppSession.init(request, [env.SESSION_SECRET]),
              ]);

              /**
               * Create Hydrogen's Storefront client.
               */
              const { storefront } = createStorefrontClient({
                cache,
                waitUntil,
                i18n: getLocaleFromRequest(request),
                publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
                privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
                storeDomain: env.PUBLIC_STORE_DOMAIN,
                storefrontId: env.PUBLIC_STOREFRONT_ID,
                storefrontHeaders: getStorefrontHeaders(request),
              });

              /**
               * Create a client for Customer Account API.
               */
              const customerAccount = createCustomerAccountClient({
                waitUntil,
                request,
                session,
                customerAccountId: env.PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID,
                customerAccountUrl: env.PUBLIC_CUSTOMER_ACCOUNT_API_URL,
              });

              /*
               * Create a cart handler that will be used to
               * create and update the cart in the session.
               */
              const cart = createCartHandler({
                storefront,
                customerAccount,
                getCartId: cartGetIdDefault(request.headers),
                setCartId: cartSetIdDefault(),
                cartQueryFragment: CART_QUERY_FRAGMENT,
              });

              /**
               * Create a Remix request handler and pass
               * Hydrogen's Storefront client to the loader context.
               */
              const handleRequest = createRequestHandler({
                build: remixBuild,
                mode: process.env.NODE_ENV,
                getLoadContext: (): AppLoadContext => ({
                  session,
                  storefront,
                  customerAccount,
                  cart,
                  env,
                  waitUntil,
                }),
              });

              const response = await handleRequest(request);

              if (response.status === 404) {
                /**
                 * Check for redirects only when there's a 404 from the app.
                 * If the redirect doesn't exist, then \`storefrontRedirect\`
                 * will pass through the 404 response.
                 */
                return storefrontRedirect({ request, response, storefront });
              }

              return response;
            } catch (error) {
              // eslint-disable-next-line no-console
              console.error(error);
              return new Response("An unexpected error occurred", { status: 500 });
            }
          },
        };

        function getLocaleFromRequest(request: Request): I18nLocale {
          const defaultLocale: I18nLocale = { language: "EN", country: "US" };
          const supportedLocales = {
            ES: "ES",
            FR: "FR",
            DE: "DE",
            JP: "JA",
          } as Record<I18nLocale["country"], I18nLocale["language"]>;

          const url = new URL(request.url);
          const domain = url.hostname
            .split(".")
            .pop()
            ?.toUpperCase() as keyof typeof supportedLocales;

          return domain && supportedLocales[domain]
            ? { language: supportedLocales[domain], country: domain }
            : defaultLocale;
        }
        "
      `);
    });
  });

  it('replace cart path for i18n subfolder strategy', async () => {
    await inTemporaryDirectory(async (tmpDir) => {
      const skeletonDir = getSkeletonSourceDir();
      await copyFile(joinPath(skeletonDir, cartTsx), joinPath(tmpDir, cartTsx));
      await copyFile(
        joinPath(skeletonDir, addToCartButtonTsx),
        joinPath(tmpDir, addToCartButtonTsx),
      );
      await copyFile(joinPath(skeletonDir, rootTsx), joinPath(tmpDir, rootTsx));

      await replaceI18nCartPath({rootDirectory: tmpDir}, {});

      const newRootFile = await readFile(joinPath(tmpDir, rootTsx));
      expect(() => checkTypes(newRootFile)).not.toThrow();

      expect(newRootFile).toMatchInlineSnapshot(`
        "import { useNonce } from "@shopify/hydrogen";
        import {
          defer,
          type SerializeFrom,
          type LoaderFunctionArgs,
        } from "@shopify/remix-oxygen";
        import {
          Links,
          Meta,
          Outlet,
          Scripts,
          LiveReload,
          useMatches,
          useRouteError,
          useLoaderData,
          ScrollRestoration,
          isRouteErrorResponse,
          type ShouldRevalidateFunction,
        } from "@remix-run/react";
        import type { CustomerAccessToken } from "@shopify/hydrogen/storefront-api-types";
        import favicon from "../public/favicon.svg";
        import resetStyles from "./styles/reset.css";
        import appStyles from "./styles/app.css";
        import { Layout } from "~/components/Layout";

        /**
         * This is important to avoid re-fetching root queries on sub-navigations
         */
        export const shouldRevalidate: ShouldRevalidateFunction = ({
          formMethod,
          currentUrl,
          nextUrl,
        }) => {
          // revalidate when a mutation is performed e.g add to cart, login...
          if (formMethod && formMethod !== "GET") {
            return true;
          }

          // revalidate when manually revalidating via useRevalidator
          if (currentUrl.toString() === nextUrl.toString()) {
            return true;
          }

          return false;
        };

        export function links() {
          return [
            { rel: "stylesheet", href: resetStyles },
            { rel: "stylesheet", href: appStyles },
            {
              rel: "preconnect",
              href: "https://cdn.shopify.com",
            },
            {
              rel: "preconnect",
              href: "https://shop.app",
            },
            { rel: "icon", type: "image/svg+xml", href: favicon },
          ];
        }

        /**
         * Access the result of the root loader from a React component.
         */
        export const useRootLoaderData = () => {
          const [root] = useMatches();
          return root?.data as SerializeFrom<typeof loader>;
        };

        const DEFAULT_LOCALE = {
          pathPrefix: "",
          language: "EN",
          country: "US",
        };

        export function usePrefixPathWithLocale(path: string) {
          const rootData = useRootLoaderData();
          const selectedLocale = rootData?.selectedLocale ?? DEFAULT_LOCALE;

          return \`\${selectedLocale.pathPrefix}\${
            path.startsWith("/") ? path : "/" + path
          }\`;
        }

        export async function loader({ context }: LoaderFunctionArgs) {
          const { storefront, customerAccount, cart } = context;
          const publicStoreDomain = context.env.PUBLIC_STORE_DOMAIN;

          const isLoggedInPromise = customerAccount.isLoggedIn();
          const cartPromise = cart.get();

          // defer the footer query (below the fold)
          const footerPromise = storefront.query(FOOTER_QUERY, {
            cache: storefront.CacheLong(),
            variables: {
              footerMenuHandle: "footer", // Adjust to your footer menu handle
            },
          });

          // await the header query (above the fold)
          const headerPromise = storefront.query(HEADER_QUERY, {
            cache: storefront.CacheLong(),
            variables: {
              headerMenuHandle: "main-menu", // Adjust to your header menu handle
            },
          });

          return defer(
            {
              cart: cartPromise,
              footer: footerPromise,
              header: await headerPromise,
              isLoggedIn: isLoggedInPromise,
              publicStoreDomain,
              selectedLocale: storefront.i18n,
            },
            {
              headers: {
                "Set-Cookie": await context.session.commit(),
              },
            }
          );
        }

        export default function App() {
          const nonce = useNonce();
          const data = useLoaderData<typeof loader>();

          return (
            <html lang="en">
              <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <Meta />
                <Links />
              </head>
              <body>
                <Layout {...data}>
                  <Outlet />
                </Layout>
                <ScrollRestoration nonce={nonce} />
                <Scripts nonce={nonce} />
                <LiveReload nonce={nonce} />
              </body>
            </html>
          );
        }

        export function ErrorBoundary() {
          const error = useRouteError();
          const rootData = useRootLoaderData();
          const nonce = useNonce();
          let errorMessage = "Unknown error";
          let errorStatus = 500;

          if (isRouteErrorResponse(error)) {
            errorMessage = error?.data?.message ?? error.data;
            errorStatus = error.status;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          return (
            <html lang="en">
              <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <Meta />
                <Links />
              </head>
              <body>
                <Layout {...rootData}>
                  <div className="route-error">
                    <h1>Oops</h1>
                    <h2>{errorStatus}</h2>
                    {errorMessage && (
                      <fieldset>
                        <pre>{errorMessage}</pre>
                      </fieldset>
                    )}
                  </div>
                </Layout>
                <ScrollRestoration nonce={nonce} />
                <Scripts nonce={nonce} />
                <LiveReload nonce={nonce} />
              </body>
            </html>
          );
        }

        const MENU_FRAGMENT = \`#graphql
          fragment MenuItem on MenuItem {
            id
            resourceId
            tags
            title
            type
            url
          }
          fragment ChildMenuItem on MenuItem {
            ...MenuItem
          }
          fragment ParentMenuItem on MenuItem {
            ...MenuItem
            items {
              ...ChildMenuItem
            }
          }
          fragment Menu on Menu {
            id
            items {
              ...ParentMenuItem
            }
          }
        \` as const;

        const HEADER_QUERY = \`#graphql
          fragment Shop on Shop {
            id
            name
            description
            primaryDomain {
              url
            }
            brand {
              logo {
                image {
                  url
                }
              }
            }
          }
          query Header(
            $country: CountryCode
            $headerMenuHandle: String!
            $language: LanguageCode
          ) @inContext(language: $language, country: $country) {
            shop {
              ...Shop
            }
            menu(handle: $headerMenuHandle) {
              ...Menu
            }
          }
          \${MENU_FRAGMENT}
        \` as const;

        const FOOTER_QUERY = \`#graphql
          query Footer(
            $country: CountryCode
            $footerMenuHandle: String!
            $language: LanguageCode
          ) @inContext(language: $language, country: $country) {
            menu(handle: $footerMenuHandle) {
              ...Menu
            }
          }
          \${MENU_FRAGMENT}
        \` as const;
        "
      `);

      const newCartContent = await readFile(joinPath(tmpDir, cartTsx));
      expect(() => checkTypes(newCartContent)).not.toThrow();

      expect(newCartContent).toMatchInlineSnapshot(`
        "import { CartForm, Image, Money } from "@shopify/hydrogen";
        import type { CartLineUpdateInput } from "@shopify/hydrogen/storefront-api-types";
        import { Link } from "@remix-run/react";
        import type { CartApiQueryFragment } from "storefrontapi.generated";
        import { useVariantUrl } from "~/lib/variants";
        import { usePrefixPathWithLocale } from "~/root";

        type CartLine = CartApiQueryFragment["lines"]["nodes"][0];

        type CartMainProps = {
          cart: CartApiQueryFragment | null;
          layout: "page" | "aside";
        };

        export function CartMain({ layout, cart }: CartMainProps) {
          const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
          const withDiscount =
            cart &&
            Boolean(cart?.discountCodes?.filter((code) => code.applicable)?.length);
          const className = \`cart-main \${withDiscount ? "with-discount" : ""}\`;

          return (
            <div className={className}>
              <CartEmpty hidden={linesCount} layout={layout} />
              <CartDetails cart={cart} layout={layout} />
            </div>
          );
        }

        function CartDetails({ layout, cart }: CartMainProps) {
          const cartHasItems = !!cart && cart.totalQuantity > 0;

          return (
            <div className="cart-details">
              <CartLines lines={cart?.lines} layout={layout} />
              {cartHasItems && (
                <CartSummary cost={cart.cost} layout={layout}>
                  <CartDiscounts discountCodes={cart.discountCodes} />
                  <CartCheckoutActions checkoutUrl={cart.checkoutUrl} />
                </CartSummary>
              )}
            </div>
          );
        }

        function CartLines({
          lines,
          layout,
        }: {
          layout: CartMainProps["layout"];
          lines: CartApiQueryFragment["lines"] | undefined;
        }) {
          if (!lines) return null;

          return (
            <div aria-labelledby="cart-lines">
              <ul>
                {lines.nodes.map((line) => (
                  <CartLineItem key={line.id} line={line} layout={layout} />
                ))}
              </ul>
            </div>
          );
        }

        function CartLineItem({
          layout,
          line,
        }: {
          layout: CartMainProps["layout"];
          line: CartLine;
        }) {
          const { id, merchandise } = line;
          const { product, title, image, selectedOptions } = merchandise;
          const lineItemUrl = useVariantUrl(product.handle, selectedOptions);

          return (
            <li key={id} className="cart-line">
              {image && (
                <Image
                  alt={title}
                  aspectRatio="1/1"
                  data={image}
                  height={100}
                  loading="lazy"
                  width={100}
                />
              )}

              <div>
                <Link
                  prefetch="intent"
                  to={lineItemUrl}
                  onClick={() => {
                    if (layout === "aside") {
                      // close the drawer
                      window.location.href = lineItemUrl;
                    }
                  }}
                >
                  <p>
                    <strong>{product.title}</strong>
                  </p>
                </Link>
                <CartLinePrice line={line} as="span" />
                <ul>
                  {selectedOptions.map((option) => (
                    <li key={option.name}>
                      <small>
                        {option.name}: {option.value}
                      </small>
                    </li>
                  ))}
                </ul>
                <CartLineQuantity line={line} />
              </div>
            </li>
          );
        }

        function CartCheckoutActions({ checkoutUrl }: { checkoutUrl: string }) {
          if (!checkoutUrl) return null;

          return (
            <div>
              <a href={checkoutUrl} target="_self">
                <p>Continue to Checkout &rarr;</p>
              </a>
              <br />
            </div>
          );
        }

        export function CartSummary({
          cost,
          layout,
          children = null,
        }: {
          children?: React.ReactNode;
          cost: CartApiQueryFragment["cost"];
          layout: CartMainProps["layout"];
        }) {
          const className =
            layout === "page" ? "cart-summary-page" : "cart-summary-aside";

          return (
            <div aria-labelledby="cart-summary" className={className}>
              <h4>Totals</h4>
              <dl className="cart-subtotal">
                <dt>Subtotal</dt>
                <dd>
                  {cost?.subtotalAmount?.amount ? (
                    <Money data={cost?.subtotalAmount} />
                  ) : (
                    "-"
                  )}
                </dd>
              </dl>
              {children}
            </div>
          );
        }

        function CartLineRemoveButton({ lineIds }: { lineIds: string[] }) {
          const cartPath = usePrefixPathWithLocale("/cart");
          return (
            <CartForm
              route={cartPath}
              action={CartForm.ACTIONS.LinesRemove}
              inputs={{ lineIds }}
            >
              <button type="submit">Remove</button>
            </CartForm>
          );
        }

        function CartLineQuantity({ line }: { line: CartLine }) {
          if (!line || typeof line?.quantity === "undefined") return null;
          const { id: lineId, quantity } = line;
          const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
          const nextQuantity = Number((quantity + 1).toFixed(0));

          return (
            <div className="cart-line-quantity">
              <small>Quantity: {quantity} &nbsp;&nbsp;</small>
              <CartLineUpdateButton lines={[{ id: lineId, quantity: prevQuantity }]}>
                <button
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1}
                  name="decrease-quantity"
                  value={prevQuantity}
                >
                  <span>&#8722; </span>
                </button>
              </CartLineUpdateButton>
              &nbsp;
              <CartLineUpdateButton lines={[{ id: lineId, quantity: nextQuantity }]}>
                <button
                  aria-label="Increase quantity"
                  name="increase-quantity"
                  value={nextQuantity}
                >
                  <span>&#43;</span>
                </button>
              </CartLineUpdateButton>
              &nbsp;
              <CartLineRemoveButton lineIds={[lineId]} />
            </div>
          );
        }

        function CartLinePrice({
          line,
          priceType = "regular",
          ...passthroughProps
        }: {
          line: CartLine;
          priceType?: "regular" | "compareAt";
          [key: string]: any;
        }) {
          if (!line?.cost?.amountPerQuantity || !line?.cost?.totalAmount) return null;

          const moneyV2 =
            priceType === "regular"
              ? line.cost.totalAmount
              : line.cost.compareAtAmountPerQuantity;

          if (moneyV2 == null) {
            return null;
          }

          return (
            <div>
              <Money withoutTrailingZeros {...passthroughProps} data={moneyV2} />
            </div>
          );
        }

        export function CartEmpty({
          hidden = false,
          layout = "aside",
        }: {
          hidden: boolean;
          layout?: CartMainProps["layout"];
        }) {
          return (
            <div hidden={hidden}>
              <br />
              <p>
                Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
                started!
              </p>
              <br />
              <Link
                to="/collections"
                onClick={() => {
                  if (layout === "aside") {
                    window.location.href = "/collections";
                  }
                }}
              >
                Continue shopping →
              </Link>
            </div>
          );
        }

        function CartDiscounts({
          discountCodes,
        }: {
          discountCodes: CartApiQueryFragment["discountCodes"];
        }) {
          const codes: string[] =
            discountCodes
              ?.filter((discount) => discount.applicable)
              ?.map(({ code }) => code) || [];

          return (
            <div>
              {/* Have existing discount, display it with a remove option */}
              <dl hidden={!codes.length}>
                <div>
                  <dt>Discount(s)</dt>
                  <UpdateDiscountForm>
                    <div className="cart-discount">
                      <code>{codes?.join(", ")}</code>
                      &nbsp;
                      <button>Remove</button>
                    </div>
                  </UpdateDiscountForm>
                </div>
              </dl>

              {/* Show an input to apply a discount */}
              <UpdateDiscountForm discountCodes={codes}>
                <div>
                  <input type="text" name="discountCode" placeholder="Discount code" />
                  &nbsp;
                  <button type="submit">Apply</button>
                </div>
              </UpdateDiscountForm>
            </div>
          );
        }

        function UpdateDiscountForm({
          discountCodes,
          children,
        }: {
          discountCodes?: string[];
          children: React.ReactNode;
        }) {
          const cartPath = usePrefixPathWithLocale("/cart");
          return (
            <CartForm
              route={cartPath}
              action={CartForm.ACTIONS.DiscountCodesUpdate}
              inputs={{
                discountCodes: discountCodes || [],
              }}
            >
              {children}
            </CartForm>
          );
        }

        function CartLineUpdateButton({
          children,
          lines,
        }: {
          children: React.ReactNode;
          lines: CartLineUpdateInput[];
        }) {
          const cartPath = usePrefixPathWithLocale("/cart");
          return (
            <CartForm
              route={cartPath}
              action={CartForm.ACTIONS.LinesUpdate}
              inputs={{ lines }}
            >
              {children}
            </CartForm>
          );
        }
        "
      `);

      const newAddToCartButtonContent = await readFile(
        joinPath(tmpDir, addToCartButtonTsx),
      );
      expect(() => checkTypes(newAddToCartButtonContent)).not.toThrow();

      expect(newAddToCartButtonContent).toMatchInlineSnapshot(`
        "import { type FetcherWithComponents } from "@remix-run/react";
        import { CartForm } from "@shopify/hydrogen";
        import type { CartLineInput } from "@shopify/hydrogen/storefront-api-types";
        import { usePrefixPathWithLocale } from "~/root";

        export function AddToCartButton({
          analytics,
          children,
          disabled,
          lines,
          onClick,
        }: {
          analytics?: unknown;
          children: React.ReactNode;
          disabled?: boolean;
          lines: CartLineInput[];
          onClick?: () => void;
        }) {
          const cartPath = usePrefixPathWithLocale("/cart");
          return (
            <CartForm
              route={cartPath}
              inputs={{ lines }}
              action={CartForm.ACTIONS.LinesAdd}
            >
              {(fetcher: FetcherWithComponents<any>) => (
                <>
                  <input
                    name="analytics"
                    type="hidden"
                    value={JSON.stringify(analytics)}
                  />
                  <button
                    type="submit"
                    onClick={onClick}
                    disabled={disabled ?? fetcher.state !== "idle"}
                  >
                    {children}
                  </button>
                </>
              )}
            </CartForm>
          );
        }
        "
      `);
    });
  });
});
