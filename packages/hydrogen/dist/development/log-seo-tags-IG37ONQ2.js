// src/seo/log-seo-tags.ts
function Logger({ headTags }) {
  logSeoTags(headTags);
  return null;
}
var headingStyle = "text-transform: uppercase;";
var titleStyle = "text-transform: uppercase; font-weight: bold; text-transform: uppercase;font-weight: bold";
function logSeoTags(headTags) {
  console.log(" ");
  console.log("%cSEO Meta Tags", `${titleStyle}`);
  console.log(" ");
  headTags.forEach((tag) => {
    if (tag.tag === "script") {
      console.log(`%c\u2022 JSON LD `, headingStyle);
      if (tag.children) {
        try {
          console.table(JSON.parse(tag.children), ["name", "content"]);
        } catch {
          console.log(tag.children);
        }
      }
    } else {
      console.log(`%c\u2022 ${tag.tag} `, headingStyle);
      if (tag.children) {
        if (typeof tag.children === "string") {
          console.log(`\u21B3 ${tag.children}`);
        } else {
          try {
            Object.entries(JSON.parse(tag.children)).map(
              ([key, val]) => console.log(`\u21B3 ${val}`)
            );
          } catch {
            console.log(tag.children);
          }
        }
      }
      if (tag.props.property === "og:image:url") {
        const urlKey = tag.props.content;
        fetchImage(urlKey).then((image) => {
          const imageStyle = `font-size: 400px; padding: 10px; background: white url(${image}) no-repeat center; background-size: contain;`;
          console.log(`%c\u2022 Share image preview`, headingStyle);
          console.log("%c  ", imageStyle);
          console.log(`\u21B3 ${urlKey}`);
        }).catch((err) => {
          console.error(err);
        });
      }
      Object.entries(tag.props).map(([key, val]) => {
        console.log(`\u21B3 ${key} \u2192 ${val}`);
      });
    }
    console.log(" ");
  });
}
async function fetchImage(url) {
  const result = await fetch(url);
  const data = await result.blob();
  const buff = await data.arrayBuffer();
  const base64String = arrayBufferToBase64(buff);
  return `data:image/png;base64,${base64String}`;
}
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let index = 0; index < len; index++) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

export { Logger as default, logSeoTags };
//# sourceMappingURL=log-seo-tags-IG37ONQ2.js.map
//# sourceMappingURL=log-seo-tags-IG37ONQ2.js.map