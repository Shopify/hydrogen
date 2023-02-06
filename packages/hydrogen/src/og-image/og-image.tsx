import React from 'react';
import {useMatches, useLocation} from '@remix-run/react';

import type {
  LoaderFunction,
  SerializeFrom,
  AppData,
} from '@remix-run/server-runtime';

export interface OgImageHandleFunction<
  Loader extends LoaderFunction | unknown = unknown,
> {
  (args: {
    data: Loader extends LoaderFunction ? SerializeFrom<Loader> : AppData;
  }): React.ReactNode;
}

export function OgImage() {
  const matches = useMatches();
  const location = useLocation();
  const lastMatch = matches.at(-1);

  if (lastMatch === undefined) {
    return null;
  }

  const {handle, data} = lastMatch;

  if (handle === undefined || handle.ogImage === undefined) {
    return null;
  }

  const searchParams = new URLSearchParams({
    component: encodeURIComponent(handle.ogImage({data})),
  });

  const params = searchParams.toString();

  const ogImage = `http://localhost:3000/og-image.svg?${params}`;

  return React.createElement('meta', {
    property: 'og:image',
    content: ogImage,
  });
}
