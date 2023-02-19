import {useEffect} from 'react';
import {CustomHeadTagObject} from './generate-seo-tags';

export default function Logger({headTags}: {headTags: CustomHeadTagObject[]}) {
  logSeoTags(headTags);

  return null;
}

const style = 'text-transform: uppercase;';

export function logSeoTags(headTags: CustomHeadTagObject[]) {
  const style2 =
    'text-transform: uppercase; font-weight: bold; text-transform: uppercase;font-weight: bold';

  console.log(headTags);
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

      if (tag.props.property === 'og:image:url') {
        const urlKey = tag.props.content as string;

        console.log(headTags);

        fetchImage(urlKey)
          .then((image) => {
            console.log(`%c• Share image preview`, style);

            renderImageInConsole(image);
            console.log(`↳ ${urlKey}`);
          })
          .catch((err) => {
            console.error(err);
          });
      }

      Object.entries(tag.props).map(([key, val]) => {
        console.log(`↳ ${key} → ${val}`);
      });
    }
    console.log(' ');
  });
}

async function fetchImage(url: string) {
  const result = await fetch(url);
  const data = await result.blob();
  const buff = await data.arrayBuffer();
  const base64String = arrayBufferToBase64(buff);

  return `data:image/png;base64,${base64String}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;

  for (let index = 0; index < len; index++) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

async function renderImageInConsole(str: string) {
  const style3 = `font-size: 400px; padding: 10px; background: white url(${str}) no-repeat center; background-size: contain;`;

  console.log('%c  ', style3);
}
