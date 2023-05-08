import type {AdminSession} from '@shopify/cli-kit/node/session';

export function newHydrogenStorefrontUrl(session: AdminSession) {
  const {storeFqdn} = session;
  return `https://${storeFqdn}/admin/custom_storefronts/new`;
}

export function hydrogenStorefrontsUrl(session: AdminSession) {
  const {storeFqdn} = session;
  return `https://${storeFqdn}/admin/custom_storefronts`;
}

export function hydrogenStorefrontUrl(
  session: AdminSession,
  storefrontId: string,
) {
  const {storeFqdn} = session;
  return `https://${storeFqdn}/admin/custom_storefronts/${storefrontId}`;
}

export function hydrogenStorefrontSettingsUrl(
  session: AdminSession,
  storefrontId: string,
) {
  const {storeFqdn} = session;
  return `https://${storeFqdn}/admin/custom_storefronts/${storefrontId}/settings`;
}
