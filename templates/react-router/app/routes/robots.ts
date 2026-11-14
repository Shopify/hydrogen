const ROBOTS_TXT = `User-agent: *
Disallow: /admin
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /buy/
Disallow: /api/
Disallow: /__shopify
Disallow: /search
Disallow: /collections/*sort_by*
Disallow: /collections/*filter*&*filter*

# Google AdsBot ignores the "*" group and follows only groups that name it.
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /checkout
Disallow: /search
`;

export function loader() {
  return new Response(ROBOTS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": `public, max-age=${60 * 60 * 24}`,
    },
  });
}
