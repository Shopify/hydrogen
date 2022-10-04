import {
  json,
  LoaderArgs,
  MetaFunction,
  SerializeFrom,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { PageHeader } from "~/components";
import { getPageData } from "~/data";

export async function loader({ params }: LoaderArgs) {
  invariant(params.pageHandle, "Missing page handle");

  const page = await getPageData({
    handle: params.pageHandle,
    params,
  });

  return json(
    { page },
    {
      headers: {
        // TODO cacheLong()
      },
    }
  );
}

export const meta: MetaFunction = ({
  data,
}: {
  data: SerializeFrom<typeof loader> | undefined;
}) => {
  return {
    title: data?.page?.seo?.title ?? "Page",
    description: data?.page?.seo?.description,
  };
};

export default function Page() {
  const { page } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader heading={page.title}>
        <div
          dangerouslySetInnerHTML={{ __html: page.body }}
          className="prose dark:prose-invert"
        />
      </PageHeader>
    </>
  );
}
