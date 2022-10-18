import { redirect } from "@remix-run/cloudflare";

export async function loader() {
  return redirect("/products");
}
