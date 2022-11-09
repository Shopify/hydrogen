import {MediaFile} from './MediaFile.js';

describe(`<MediaFile/>`, () => {
  // eslint-disable-next-line jest/expect-expect
  it.skip(`typescript types`, () => {
    // ensure className is valid
    <MediaFile className="" data={{id: 'test'}} />;

    // @ts-expect-error 'blah' isn't a valid property
    <MediaFile data={{blah: 'test'}} />;
  });
});
