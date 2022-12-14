import { redirect } from "@shopify/remix-oxygen";
import { getLocaleFromRequest } from "~/lib/utils";

export async function logout(request, context) {
  const { session } = context;
  session.unset("customerAccessToken");

  const { pathPrefix } = getLocaleFromRequest(request);

  return redirect(`${pathPrefix}/account/login`, {
    headers: {
      "Set-Cookie": await session.commit(),
    },
  });
}

export async function loader({ request }) {
  const { pathPrefix } = getLocaleFromRequest(request);
  return redirect(pathPrefix);
}

export const action = async ({ request, context }) => {
  return logout(request, context);
};
