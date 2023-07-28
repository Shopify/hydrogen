import {IMAGE_TEXT_QUERY} from './ImageText.schema';

export async function getImageText({
  context,
  handle,
}: {
  context: any;
  handle: string;
}) {
  const {section} = await context.api.graphql(IMAGE_TEXT_QUERY, {
    variables: {handle},
  });
  return section;
}
