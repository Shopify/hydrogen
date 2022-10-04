import { json, LoaderArgs } from "@remix-run/cloudflare";
import { getFeaturedData } from "~/data";

export async function loader({params}: LoaderArgs) {
  return json(await getFeaturedData({ params }));
}
