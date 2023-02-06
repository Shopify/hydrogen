import {LoaderArgs} from '@shopify/remix-oxygen';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import parse from 'html-react-parser';

export async function loader({request}: LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  const {component, ...props} = Object.fromEntries(searchParams.entries());
  const Component = decodeURIComponent(component);
  const svg = React.createElement(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 1200 630',
      width: 1200,
      height: 630,
    },
    <>
      <rect width="100%" height="100%" fill="#000" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{fontFamily: 'sans-serif', fontSize: '30px', fill: 'white'}}
      >
        {Component}
      </text>
    </>,
  );

  return render(svg);
}

export async function render(component: React.ReactSVGElement) {
  try {
    const svg = renderToStaticMarkup(component);
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, s-maxage=60',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to render Share Image:', component, error);

    return new Response(
      renderToStaticMarkup(
        <svg>
          <text>Default share image</text>
        </svg>,
      ),
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, s-maxage=60',
        },
      },
    );
  }
}
