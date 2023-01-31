import {HeadTag} from './generate-seo-tags';

export default function Logger({headTags}: {headTags: HeadTag[]}) {
  logSeoTags(headTags);

  return null;
}

export function logSeoTags(headTags: HeadTag[]) {
  const style = 'text-transform: uppercase;';
  const style2 =
    'text-transform: uppercase; font-weight: bold; text-transform: uppercase;font-weight: bold';

  console.log(' ');
  console.log('%cSEO Meta Tags', `${style2}`);
  console.log(' ');

  headTags.forEach((tag) => {
    if (tag.tag === 'script') {
      console.log(`%c• JSON LD `, style);

      if (tag.children) {
        try {
          console.table(JSON.parse(tag.children), ['name', 'content']);
        } catch {
          console.log(tag.children);
        }
      }
    } else {
      console.log(`%c• ${tag.tag} `, style);

      if (tag.children) {
        if (typeof tag.children === 'string') {
          console.log(`↳ ${tag.children}`);
        } else {
          try {
            Object.entries(JSON.parse(tag.children)).map(([key, val]) =>
              console.log(`↳ ${val}`),
            );
          } catch {
            console.log(tag.children);
          }
        }
      }

      Object.entries(tag.props).map(([key, val]) =>
        console.log(`↳ ${key} → ${val}`),
      );
    }
    console.log(' ');
  });
}
