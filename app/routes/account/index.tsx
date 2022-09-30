import { type LoaderArgs, redirect, json } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { getSession } from "~/lib/session.server";

export async function loader({ request, context }: LoaderArgs) {
  const session = await getSession(request, context);
  const customerAccessToken = await session.get("customerAccessToken");

  if (!customerAccessToken) {
    return redirect("/account/login");
  }

  return json({
    customerAccessToken,
  });
}

export default function Account() {
  const { customerAccessToken } = useLoaderData<typeof loader>();
  return (
    <div>
      <h1>Account for Mr. {customerAccessToken}</h1>
    </div>
  );
}
