import { redirect } from "react-router";

import type { Route } from "./+types/($locale).account._index";

export async function loader({ params }: Route.LoaderArgs) {
  return redirect(getAccountOrdersPath(params.locale));
}

function getAccountOrdersPath(locale: string | undefined) {
  return locale ? `/${locale}/account/orders` : "/account/orders";
}
