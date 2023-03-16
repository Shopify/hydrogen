import {describe, it} from 'vitest';

import {MediaFile} from './MediaFile.js';

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
});
