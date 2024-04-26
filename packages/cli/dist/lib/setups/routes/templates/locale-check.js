async function loader({ params, context }) {
  const { language, country } = context.storefront.i18n;
  if (params.locale && params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()) {
    throw new Response(null, { status: 404 });
  }
  return null;
}

export { loader };
