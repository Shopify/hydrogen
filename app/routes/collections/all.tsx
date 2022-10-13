import { redirect } from "@remix-run/oxygen";

export async function loader() {
  return redirect("/products");
}
