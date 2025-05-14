import {camelize} from '@shopify/cli-kit/common/string'
import type {CamelCasedProperties} from 'type-fest'

export function flagsToCamelObject<T extends Record<string, any>>(obj: T) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[camelize(key) as any] = value
    return acc
  }, {} as any) as CamelCasedProperties<T>
}
