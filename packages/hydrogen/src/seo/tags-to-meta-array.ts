import type {TagKey, CustomHeadTagObject} from './generate-seo-tags';

interface TagsToMetaArrayOptions {
  tag?: TagKey[] | TagKey;
}
export function tagsToMetaArray(
  tags: CustomHeadTagObject[],
  options: TagsToMetaArrayOptions = {},
) {
  const filterTags = Array.isArray(options.tag) ? options.tag : [options.tag];

  const returnTags =
    options.tag && filterTags.length > 0
      ? tags.filter((tag) => filterTags.includes(tag.tag))
      : tags;

  return returnTags.map(transform);
}

function transform(tag: CustomHeadTagObject) {
  let result: Record<string, unknown> = {};

  if (tag.tag === 'title') {
    result.title = tag.props.content;
  } else {
    result = tag.props;
  }

  return result as HtmlMetaDescriptor;
}

type HtmlMetaDescriptor =
  | {
      charSet: 'utf-8';
    }
  | {
      title: string;
    }
  | {
      name: string;
      content: string;
    }
  | {
      property: string;
      content: string;
    }
  | {
      httpEquiv: string;
      content: string;
    }
  | {
      [name: string]: string;
    };
