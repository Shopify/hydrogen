import {faker} from '@faker-js/faker';
import type {Image as ImageType} from './storefront-api-types.js';
import type {PartialDeep} from 'type-fest';

export function getPreviewImage(image: Partial<ImageType> = {}): PartialDeep<
  ImageType,
  {recurseIntoArrays: true}
> & {
  url: ImageType['url'];
} {
  return {
    id: image.id ?? faker.word.words(),
    altText: image.altText ?? faker.word.words(),
    url: image.url ?? faker.string.uuid(),
    width: image.width ?? faker.number.int(),
    height: image.height ?? faker.number.int(),
  };
}
