import {describe, expect, it} from 'vitest';

import {createRef} from 'react';
import {render, screen} from '@testing-library/react';
import {MediaFile} from './MediaFile.js';

const testId = 'media-file';

describe(`<MediaFile/>`, () => {
  it.skip(`typescript types`, () => {
    // ensure className is valid
    <MediaFile className="" data={{id: 'test'}} />;

    // @ts-expect-error 'blah' isn't a valid property
    <MediaFile data={{blah: 'test'}} />;

    // Allow some of the mediaOptions to exist, instead of requiring all of them.
    <MediaFile data={{id: 'test'}} mediaOptions={{image: {}, video: {}}} />;
    <MediaFile data={{id: 'test'}} mediaOptions={{}} />;
  });

  it('allows ref on video', () => {
    const ref = createRef<HTMLVideoElement>();

    const data = {
      __typename: 'Video' as const,
      mediaContentType: 'VIDEO' as const,
      sources: [],
    };

    render(
      <MediaFile
        data={data}
        mediaOptions={{
          video: {
            ref,
          },
        }}
        data-testid={testId}
      />,
    );

    const mediaFile = screen.getByTestId(testId);

    expect(ref.current).toBe(mediaFile);
  });

  it('allows ref on external video', () => {
    const ref = createRef<HTMLIFrameElement>();

    const data = {
      __typename: 'ExternalVideo' as const,
      mediaContentType: 'EXTERNAL_VIDEO' as const,
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      host: 'YOUTUBE' as const,
    };

    render(
      <MediaFile
        data={data}
        mediaOptions={{
          externalVideo: {
            ref,
          },
        }}
        data-testid={testId}
      />,
    );

    const mediaFile = screen.getByTestId(testId);

    expect(ref.current).toBe(mediaFile);
  });
});
