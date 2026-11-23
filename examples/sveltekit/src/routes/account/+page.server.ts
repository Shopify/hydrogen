import { getCustomerAccountPageData } from "$lib/customer-account";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, request, setHeaders }) => {
  if (!locals.storefront.customerAccountsEnabled) {
    return { isCustomerAccountAvailable: false, customer: null, error: null, loginFailed: false };
  }

  const accountData = await getCustomerAccountPageData({
    request,
  });
  const cacheControl = accountData.headers.get("cache-control");
  if (cacheControl) setHeaders({ "cache-control": cacheControl });
  const requestUrl = new URL(request.url);

  if (!accountData.customer && !accountData.error && !accountData.loginFailed) {
    if (requestUrl.searchParams.get("refreshed") !== "1") {
      throw redirect(
        303,
        `/account/refresh?return_to=${encodeURIComponent("/account?refreshed=1")}`,
      );
    }
  }

  return {
    isCustomerAccountAvailable: true,
    customer: accountData.customer,
    error: accountData.error,
    loginFailed: accountData.loginFailed,
  };
};
