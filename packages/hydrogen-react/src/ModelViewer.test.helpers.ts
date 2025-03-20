import type {Model3d} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';
import {faker} from '@faker-js/faker';
import {getPreviewImage} from './Image.test.helpers.js';

export function getModel3d(
  model: PartialDeep<Model3d, {recurseIntoArrays: true}> = {},
): PartialDeep<Model3d, {recurseIntoArrays: true}> {
  return {
    id: model.id ?? faker.word.words(),
    mediaContentType: 'MODEL_3D',
    alt: model.alt ?? faker.word.words(),
    previewImage: getPreviewImage(model.previewImage ?? undefined),
    sources: model.sources ?? [
      {url: faker.internet.url()},
      {url: faker.internet.url()},
    ],
  };
}
