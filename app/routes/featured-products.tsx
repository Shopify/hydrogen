import { json } from "@remix-run/cloudflare";
import { getFeaturedData } from "~/data";

export async function loader() {
  return json(await getFeaturedData({ language: "EN", country: "US" }));
}
