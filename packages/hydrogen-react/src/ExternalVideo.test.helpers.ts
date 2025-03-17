import {PartialDeep} from 'type-fest';
import type {ExternalVideo as ExternalVideoType} from './storefront-api-types.js';
import {faker} from '@faker-js/faker';
import {getPreviewImage} from './Image.test.helpers.js';

export function getExternalVideoData(
  externalVideo: Partial<ExternalVideoType> = {},
): PartialDeep<ExternalVideoType, {recurseIntoArrays: true}> {
  const useYouTube =
    externalVideo.host ?? faker.number.int({max: 2, min: 1}) === 1;
  return {
    id: externalVideo.id ?? faker.word.words(),
    mediaContentType: 'EXTERNAL_VIDEO',
    embedUrl: externalVideo.embedUrl ?? faker.internet.url(),
    host: useYouTube ? 'YOUTUBE' : 'VIMEO',
    previewImage: getPreviewImage(externalVideo.previewImage ?? undefined),
  };
}
