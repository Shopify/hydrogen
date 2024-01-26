import type {SectionsFragment} from 'storefrontapi.generated';

/**
 * Transform a route metaobject into a route object parsing field and references
 * @param template
 * @param acc
 */
export function routeParser(content: any, acc: any = {}) {
  // TODO: add support for field
  if (!content) return acc;
  const {type, value, id, fields, reference, references} = content;

  let node = acc;

  if (fields) {
    if (id) {
      node.id = id;
    }
    if (Array.isArray(node)) {
      node.push(parseFields(fields, {type}));
    } else {
      node = parseFields(fields);
    }
  } else if (reference) {
    node = routeParser(reference, {});
  } else if (references) {
    node = parseReferences(references.nodes, []);
  } else if (value) {
    node = value;
  } else {
    node = content;
  }

  return node;
}

function parseFields(fields: any[], acc: any = {}) {
  return fields.reduce((obj, field) => {
    const value = routeParser(field, {});
    obj[field.key] = value;
    return obj;
  }, acc);
}

function parseReferences(nodes: any, acc: any = []) {
  return nodes.reduce((_acc: any, node: any) => {
    const value = routeParser(node, _acc);
    if (value) {
      if (Array.isArray(value)) {
        _acc = value;
      } else {
        _acc.push(value);
      }
    }
    return _acc;
  }, acc);
}
