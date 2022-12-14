import { json } from "@shopify/remix-oxygen";
import { notFoundMaybeRedirect, RESOURCE_TYPES } from "@shopify/hydrogen";

import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { PageHeader } from "~/components";

export async function loader({ request, params, context }) {
  invariant(params.pageHandle, "Missing page handle");

  const { page } = await context.storefront.query(PAGE_QUERY, {
    variables: {
      handle: params.pageHandle,
      language: context.storefront.i18n?.language,
    },
  });

  if (!page) {
    throw await notFoundMaybeRedirect(request, context);
  }

  return json(
    { page },
    {
      headers: {
        // TODO cacheLong()
      },
    }
  );
}

export const meta = ({ data }) => {
  return {
    title: data?.page?.seo?.title ?? "Page",
    description: data?.page?.seo?.description,
  };
};

export const handle = {
  hydrogen: {
    resourceType: RESOURCE_TYPES.PAGE,
  },
};

export default function Page() {
  const { page } = useLoaderData();

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

const PAGE_QUERY = `#graphql
  query PageDetails($language: LanguageCode, $handle: String!)
  @inContext(language: $language) {
    page(handle: $handle) {
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
`;
