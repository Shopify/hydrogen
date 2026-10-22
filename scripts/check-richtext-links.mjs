import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {RichText} from '../packages/hydrogen-react/dist/node-dev/RichText.mjs';

for (const url of ['ftp://example.com', 'https://example.com']) {
  const data = JSON.stringify({
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            url,
            children: [{type: 'text', value: 'Example link', bold: true}],
          },
        ],
      },
    ],
  });

  console.log(
    `${url}: ${renderToStaticMarkup(createElement(RichText, {data}))}`,
  );
}
