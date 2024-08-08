import type {ParsedMetafields} from '@shopify/hydrogen';
import {flattenConnection, parseMetafield} from '@shopify/hydrogen';

/**
 * The `flatten` utility flattens objects from the Storefront API by: flattening connections, lifting reference and
 * references and optionally nodes steps. It parses metafields based on their type (converting string arrays to arrays
 * etc) and creates simple objects from fields.
 */

export function flatten(obj) {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj.nodes) || Array.isArray(obj.edges)) {
      return flattenConnection(obj).map((item) => flatten(item));
    } else if (Array.isArray(obj)) {
      return obj.map((item) => flatten(item));
    } else {
      const flatObj = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (
            value &&
            typeof value === 'object' &&
            (Array.isArray(value.nodes) || Array.isArray(value.edges))
          ) {
            flatObj[key] = flattenConnection(value).map((item) =>
              flatten(item),
            );
          } else if (
            value &&
            typeof value === 'object' &&
            value.type &&
            value.value
          ) {
            flatObj[key] = parseMetafieldValue(value);
          } else {
            flatObj[key] = flatten(value);
          }
        }
      }
      return flatObj;
    }
  }
  return obj;
}

function parseSection<InputType, ReturnType>(_section: InputType) {
  const section = liftEach(_section, [
    'reference',
    'references',
    // 'nodes',
  ] as const);
  const parsed = {} as Record<string, any>;

  // parse each key in the section
  for (const key in section) {
    const node = section[key];
    if (typeof node === 'object') {
      // @ts-ignore
      const isMetafield = node?.type && node?.value;
      const isArray = Array.isArray(node);
      if (isArray) {
        parsed[key] = node.map((item) => parseSection(item));
      } else if (isMetafield) {
        parsed[key] = parseMetafieldValue(node);
      } else if (node && Object.keys(node as object).length > 0) {
        parsed[key] = parseSection(node);
      } else {
        delete parsed[key];
      }
    } else {
      parsed[key] = node;
    }
  }
  return parsed as typeof section & ReturnType;
}

function parseMetafieldValue(node: Record<string, any>) {
  let parsed;

  switch (node?.type) {
    case 'single_line_text_field':
      return parseMetafield<ParsedMetafields['single_line_text_field']>(node);

    case 'multi_line_text_field':
      return parseMetafield<ParsedMetafields['multi_line_text_field']>(node);

    case 'list.single_line_text_field':
      return parseMetafield<ParsedMetafields['list.single_line_text_field']>(
        node,
      );

    case 'list.collection_reference':
      return parseMetafield<ParsedMetafields['list.collection_reference']>(
        node,
      );

    // NOTE: expand with other field types as needed for your project
    default:
      parsed = node;
  }

  return parsed;
}

type LiftOtherKeys<KeyToLift, Section> = KeyToLift extends keyof Section
  ? Lift<Section[KeyToLift], KeyToLift>
  : object;

type Lift<Section, KeyToLift> = Section extends object
  ? Section extends Array<infer Item>
    ? Lift<Item, KeyToLift>[]
    : {
        [P in Exclude<keyof Section, KeyToLift>]: P extends 'value'
          ? NonNullable<Lift<Section[P], KeyToLift>> | undefined
          : Lift<Section[P], KeyToLift>;
      } & LiftOtherKeys<KeyToLift, Section>
  : Section;

type LiftEach<Section, KeysToLift> = KeysToLift extends readonly [
  infer FirstKeyToLift,
  ...infer RemainingKeysToLift,
]
  ? LiftEach<Lift<Section, FirstKeyToLift>, RemainingKeysToLift>
  : Section;

/**
 * Lifts a key from an object, and returns a new object with the key removed.
 */
function lift<Section, KeyToRemove extends PropertyKey>(
  value: Section,
  key: KeyToRemove,
): Lift<Section, KeyToRemove> {
  const isArray = Array.isArray(value);

  function liftObject(value: any) {
    const entries = Object.entries(value)
      .filter(([prop]) => prop !== key)
      .map(([prop, val]) => {
        const liftedVal = lift(val, key);
        return [prop, liftedVal];
      });
    const target = Object.fromEntries(entries);
    const source = key in value ? lift((value as any)[key], key) : {};
    const lifted = Array.isArray(source)
      ? source
      : Object.assign(target, source);
    return lifted;
  }

  return (
    value && typeof value === 'object'
      ? isArray
        ? value.map((item) => liftObject(item))
        : liftObject(value)
      : value
  ) as Lift<Section, KeyToRemove>;
}

/**
 * Lifts each key in an array from an object, and returns a new object with the keys removed.
 */
function liftEach<Section, KeysToRemove extends ReadonlyArray<PropertyKey>>(
  obj: Section,
  keys: KeysToRemove,
): LiftEach<Section, KeysToRemove> {
  return keys.reduce<object | Section>((result, keyToLift) => {
    return lift(result, keyToLift);
  }, obj) as LiftEach<Section, KeysToRemove>;
}
