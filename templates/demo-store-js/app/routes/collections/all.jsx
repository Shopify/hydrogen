import { redirect } from "@shopify/remix-oxygen";

export async function loader({ params }) {
  return redirect(params?.lang ? `${params.lang}/products` : "/products");
}
