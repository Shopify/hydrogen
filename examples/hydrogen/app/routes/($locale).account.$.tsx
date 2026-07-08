import { redirect } from "react-router";

import { requireCustomerAccessToken } from "~/lib/customer-account";

import type { Route } from "./+types/($locale).account.$";

// fallback wild card for all unauthenticated routes in account section
export async function loader({ request, context, params }: Route.LoaderArgs) {
  await requireCustomerAccessToken(request, context.customerAccount);

  return redirect(getAccountPath(params.locale));
}

function getAccountPath(locale: string | undefined) {
  return locale ? `/${locale}/account` : "/account";
}
