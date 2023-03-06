import {PartialDeep} from 'type-fest';
import type {ExternalVideo as ExternalVideoType} from './storefront-api-types.js';
import {faker} from '@faker-js/faker';
import {getPreviewImage} from './ImageLegacy.test.helpers.js';

export function getExternalVideoData(
  externalVideo: Partial<ExternalVideoType> = {},
): PartialDeep<ExternalVideoType, {recurseIntoArrays: true}> {
  return {
    id: externalVideo.id ?? faker.random.words(),
    mediaContentType: 'EXTERNAL_VIDEO',
    embedUrl: externalVideo.embedUrl ?? faker.internet.url(),
    host:
      externalVideo.host ?? faker.datatype.number({max: 2, min: 1}) === 1
        ? 'YOUTUBE'
        : 'VIMEO',
    previewImage: getPreviewImage(externalVideo.previewImage ?? undefined),
  };
}
