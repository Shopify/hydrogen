import {useSeoConfig, useHeadTags} from './common';

export function Seo() {
  const {seo} = useSeoConfig();
  const {tags, ogTags, twitterTags, links, LdJson} = useHeadTags(seo);
  const structuredContent = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(LdJson),
      }}
    />
  );

  return (
    <>
      {tags}
      {ogTags}
      {twitterTags}
      {links}
      {structuredContent}
    </>
  );
}
