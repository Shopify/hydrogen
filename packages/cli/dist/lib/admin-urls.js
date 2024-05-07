function newHydrogenStorefrontUrl(session) {
  const { storeFqdn } = session;
  return `https://${storeFqdn}/admin/custom_storefronts/new`;
}
function hydrogenStorefrontsUrl(session) {
  const { storeFqdn } = session;
  return `https://${storeFqdn}/admin/custom_storefronts`;
}
function hydrogenStorefrontUrl(session, storefrontId) {
  const { storeFqdn } = session;
  return `https://${storeFqdn}/admin/custom_storefronts/${storefrontId}`;
}
function hydrogenStorefrontSettingsUrl(session, storefrontId) {
  const { storeFqdn } = session;
  return `https://${storeFqdn}/admin/custom_storefronts/${storefrontId}/settings`;
}

export { hydrogenStorefrontSettingsUrl, hydrogenStorefrontUrl, hydrogenStorefrontsUrl, newHydrogenStorefrontUrl };
