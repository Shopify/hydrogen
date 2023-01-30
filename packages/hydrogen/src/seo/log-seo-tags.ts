import {HeadTag} from './generate-seo-tags';

export function logSeoTags(headTags: HeadTag[]) {
  const style1 = 'color: white; background: black;';
  const style2 = 'color: cyan; background: black;';
  const style3 = 'color: yellow; background: black;';
  const style4 = 'color: pink; background: black; text-transform: uppercase;';

  console.log(' ');
  console.log(
    '%cSEO Meta Tags',
    `${style2}  font-weight: bold; text-transform: uppercase;font-weight: bold;`,
  );
  console.log(' ');

  headTags.forEach((tag) => {
    if (tag.tag === 'script') {
      console.log(`%c• %cJSON LD `, style1, style4);

      if (tag.children) {
        console.table(JSON.parse(tag.children), ['name', 'content']);
      }
    } else {
      console.log(`%c• %c${tag.tag} `, style1, style4);

      if (tag.children) {
        if (typeof tag.children === 'string') {
          console.log(`%c↳ %c${tag.children}`, style1, style3);
        } else {
          Object.entries(JSON.parse(tag.children)).map(([key, val]) =>
            console.log(`%c↳ %c${val}`, style1, style3),
          );
        }
      }

      Object.entries(tag.props).map(([key, val]) =>
        console.log(
          `%c↳ %c${key} %c→ %c${val}`,
          style1,
          style2,
          style1,
          style3,
        ),
      );
    }
    console.log(' ');
  });
}
