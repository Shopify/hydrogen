import { stripIgnoredCharacters } from "graphql";
import MagicString, { type SourceMap } from "magic-string";
import { parseSync, type Comment, type Node } from "oxc-parser";
import { walk } from "oxc-walker";

export type MinifyGraphQLLiteralsOptions = {
  /**
   * Function calls whose first string/template argument is GraphQL. Member
   * calls are matched by their final property name, e.g. `client.gql(...)`.
   */
  callIdentifiers?: readonly string[];
  /**
   * Tagged templates whose content is GraphQL. Member tags are matched by
   * their final property name, e.g. client.graphql`...`.
   */
  tagIdentifiers?: readonly string[];
};

type TransformResult = {
  code: string;
  map: SourceMap;
};

type Range = {
  start: number;
  end: number;
};

type Replacement = Range & {
  text: string;
};

const DEFAULT_CALL_IDENTIFIERS = ["gql", "graphql"];
const DEFAULT_TAG_IDENTIFIERS = ["gql", "graphql"];
const GRAPHQL_COMMENT_RE = /^\s*GraphQL\s*$/i;
const GRAPHQL_MARKER_RE = /^\s*#graphql\b\s*/;
const JS_SOURCE_RE = /\.[cm]?[jt]sx?$/;
const TS_DECLARATION_RE = /\.d\.[cm]?ts$/;
const PREFILTER_RE =
  /\b(?:gql|graphql)\s*(?:\(|`)|\[\s*["'](?:gql|graphql)["']\s*\]\s*(?:\(|`)|#graphql|\/\*\s*GraphQL\s*\*\//;
const INTERPOLATION_PLACEHOLDER_PREFIX = "GRAPHQL_LITERAL_PLACEHOLDER_";

export function minifyGraphQLLiterals(options: MinifyGraphQLLiteralsOptions = {}) {
  const callIdentifiers = new Set(options.callIdentifiers ?? DEFAULT_CALL_IDENTIFIERS);
  const tagIdentifiers = new Set(options.tagIdentifiers ?? DEFAULT_TAG_IDENTIFIERS);

  return {
    name: "minify-graphql-literals",
    enforce: "pre" as const,
    transform(code: string, id: string): TransformResult | null {
      const filename = cleanId(id);

      if (
        !JS_SOURCE_RE.test(filename) ||
        TS_DECLARATION_RE.test(filename) ||
        filename.includes("/node_modules/") ||
        !PREFILTER_RE.test(code)
      ) {
        // Early exit for files that don't contain GraphQL literals.
        return null;
      }

      const parseResult = parseSync(filename, code, {
        sourceType: "module",
      });

      if (parseResult.errors.length > 0) return null;

      const replacements: Replacement[] = [];
      const transformedNodes = new Set<string>();
      const context = {
        callIdentifiers,
        code,
        comments: parseResult.comments,
        replacements,
        tagIdentifiers,
        transformedNodes,
      };

      walk(parseResult.program, {
        enter(node) {
          if (addTaggedTemplateReplacement(node, context)) {
            this.skip();
            return;
          }

          if (addCallExpressionReplacement(node, context)) return;
          if (addMarkedTemplateLiteralReplacement(node, context)) return;

          addMarkedStringLiteralReplacement(node, context);
        },
      });

      if (replacements.length === 0) return null;

      return applyReplacements(code, replacements, filename);
    },
  };
}

function cleanId(id: string) {
  return id.replace(/[?#].*$/, "");
}

type TransformContext = {
  callIdentifiers: Set<string>;
  code: string;
  comments: Comment[];
  replacements: Replacement[];
  tagIdentifiers: Set<string>;
  transformedNodes: Set<string>;
};

function addTaggedTemplateReplacement(node: Node, context: TransformContext) {
  if (!isTaggedTemplateExpression(node)) return false;

  const tagName = getGraphQLWrapperName(node.tag);

  if (!tagName || !context.tagIdentifiers.has(tagName)) return false;

  addTemplateLiteralReplacements(context.code, node.quasi, context.replacements);
  context.transformedNodes.add(nodeKey(node.quasi));

  return true;
}

function addCallExpressionReplacement(node: Node, context: TransformContext) {
  if (!isCallExpression(node)) return false;

  const calleeName = getGraphQLWrapperName(node.callee);
  const firstArgument = node.arguments[0];

  if (!calleeName || !context.callIdentifiers.has(calleeName) || !firstArgument) return false;

  const argument = isSpreadElement(firstArgument) ? firstArgument.argument : firstArgument;

  if (isTemplateLiteral(argument)) {
    addTemplateLiteralReplacements(context.code, argument, context.replacements);
    context.transformedNodes.add(nodeKey(argument));
    return true;
  }

  if (isStringLiteral(argument)) {
    addStringLiteralReplacement(argument, false, context.replacements);
    context.transformedNodes.add(nodeKey(argument));
    return true;
  }

  return false;
}

function addMarkedTemplateLiteralReplacement(node: Node, context: TransformContext) {
  if (!isTemplateLiteral(node) || context.transformedNodes.has(nodeKey(node))) return false;

  if (templateLiteralHasGraphQLMarker(context.code, node)) {
    addTemplateLiteralReplacements(context.code, node, context.replacements);
    context.transformedNodes.add(nodeKey(node));
    return true;
  }

  if (hasLeadingGraphQLComment(context.code, context.comments, node)) {
    addTemplateLiteralReplacements(context.code, node, context.replacements, {
      removeMarker: false,
    });
    context.transformedNodes.add(nodeKey(node));
    return true;
  }

  return false;
}

function addMarkedStringLiteralReplacement(node: Node, context: TransformContext) {
  if (!isStringLiteral(node) || context.transformedNodes.has(nodeKey(node))) return false;

  const hasMarker = node.value.trimStart().startsWith("#graphql");

  if (!hasMarker && !hasLeadingGraphQLComment(context.code, context.comments, node)) {
    return false;
  }

  addStringLiteralReplacement(node, hasMarker, context.replacements);
  context.transformedNodes.add(nodeKey(node));

  return true;
}

function getGraphQLWrapperName(node: Node): string | undefined {
  if (isIdentifier(node)) return node.name;

  if (isParenthesizedExpression(node)) {
    return getGraphQLWrapperName(node.expression);
  }

  if (isMemberExpression(node)) {
    return getMemberPropertyName(node.property);
  }

  return undefined;
}

function getMemberPropertyName(node: Node): string | undefined {
  if (isIdentifier(node)) return node.name;
  if (isStringLiteral(node)) return node.value;

  return undefined;
}

type TaggedTemplateExpressionNode = Node & {
  type: "TaggedTemplateExpression";
  tag: Node;
  quasi: TemplateLiteralNode;
};

function isTaggedTemplateExpression(node: Node): node is TaggedTemplateExpressionNode {
  return node.type === "TaggedTemplateExpression";
}

type CallExpressionNode = Node & {
  type: "CallExpression";
  callee: Node;
  arguments: Node[];
};

function isCallExpression(node: Node): node is CallExpressionNode {
  return node.type === "CallExpression";
}

type SpreadElementNode = Node & {
  type: "SpreadElement";
  argument: Node;
};

function isSpreadElement(node: Node): node is SpreadElementNode {
  return node.type === "SpreadElement";
}

type TemplateLiteralNode = Node & {
  type: "TemplateLiteral";
  expressions: Node[];
};

function isTemplateLiteral(node: Node): node is TemplateLiteralNode {
  return node.type === "TemplateLiteral";
}

type StringLiteralNode = Node & {
  type: "Literal";
  value: string;
};

function isStringLiteral(node: Node): node is StringLiteralNode {
  return node.type === "Literal" && typeof node.value === "string";
}

type IdentifierNode = Node & {
  type: "Identifier";
  name: string;
};

function isIdentifier(node: Node): node is IdentifierNode {
  return node.type === "Identifier";
}

type MemberExpressionNode = Node & {
  type: "MemberExpression";
  property: Node;
};

function isMemberExpression(node: Node): node is MemberExpressionNode {
  return node.type === "MemberExpression";
}

type ParenthesizedExpressionNode = Node & {
  type: "ParenthesizedExpression";
  expression: Node;
};

function isParenthesizedExpression(node: Node): node is ParenthesizedExpressionNode {
  return node.type === "ParenthesizedExpression";
}

function nodeKey(node: Node) {
  return `${node.start}:${node.end}`;
}

function templateLiteralHasGraphQLMarker(code: string, node: TemplateLiteralNode) {
  const firstRange = getTemplatePartRanges(node)[0];

  return firstRange
    ? code.slice(firstRange.start, firstRange.end).trimStart().startsWith("#graphql")
    : false;
}

function hasLeadingGraphQLComment(code: string, comments: Comment[], node: Node) {
  const comment = findPreviousComment(comments, node.start);

  if (!comment) return false;

  return (
    GRAPHQL_COMMENT_RE.test(comment.value) && code.slice(comment.end, node.start).trim() === ""
  );
}

function findPreviousComment(comments: Comment[], position: number) {
  let low = 0;
  let high = comments.length - 1;
  let previous: Comment | undefined;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const comment = comments[middle];

    if (!comment) break;

    if (comment.end <= position) {
      previous = comment;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return previous;
}

function addStringLiteralReplacement(
  node: StringLiteralNode,
  removeMarker: boolean,
  replacements: Replacement[],
) {
  const minified = minifyGraphQLSource(removeMarker ? removeGraphQLMarker(node.value) : node.value);

  if (!minified || minified === node.value) return;

  replacements.push({
    start: node.start,
    end: node.end,
    text: JSON.stringify(minified),
  });
}

function addTemplateLiteralReplacements(
  code: string,
  node: TemplateLiteralNode,
  replacements: Replacement[],
  options: { removeMarker?: boolean } = {},
) {
  const partRanges = getTemplatePartRanges(node);

  if (partRanges.length === 0) return;

  const removeMarker = options.removeMarker ?? templateLiteralHasGraphQLMarker(code, node);

  if (node.expressions.length === 0) {
    addStaticTemplateLiteralReplacement(code, partRanges[0], removeMarker, replacements);
    return;
  }

  const interpolated = minifyInterpolatedTemplateLiteral(code, node, partRanges, removeMarker);

  if (interpolated) {
    addTemplatePartReplacements(partRanges, interpolated, replacements);
    return;
  }

  addWhitespaceCollapsedTemplateReplacements(code, partRanges, removeMarker, replacements);
}

function addStaticTemplateLiteralReplacement(
  code: string,
  range: Range,
  removeMarker: boolean,
  replacements: Replacement[],
) {
  const source = code.slice(range.start, range.end);
  const minified = minifyGraphQLSource(removeMarker ? removeGraphQLMarker(source) : source);

  if (!minified || minified === source) return;

  replacements.push({
    start: range.start,
    end: range.end,
    text: escapeTemplateLiteralText(minified),
  });
}

function addTemplatePartReplacements(
  partRanges: Range[],
  parts: string[],
  replacements: Replacement[],
) {
  for (let index = 0; index < partRanges.length; index++) {
    replacements.push({
      start: partRanges[index].start,
      end: partRanges[index].end,
      text: escapeTemplateLiteralText(parts[index]),
    });
  }
}

function addWhitespaceCollapsedTemplateReplacements(
  code: string,
  partRanges: Range[],
  removeMarker: boolean,
  replacements: Replacement[],
) {
  for (let index = partRanges.length - 1; index >= 0; index--) {
    const range = partRanges[index];
    const source = code.slice(range.start, range.end);
    const minified = whitespaceCollapsedTemplatePart(
      source,
      index,
      partRanges.length,
      removeMarker,
    );

    if (minified === source) continue;

    replacements.push({
      start: range.start,
      end: range.end,
      text: escapeTemplateLiteralText(minified),
    });
  }
}

function whitespaceCollapsedTemplatePart(
  source: string,
  index: number,
  partCount: number,
  removeMarker: boolean,
) {
  let minified = source.replace(/\s+/g, " ");

  if (index === 0) {
    minified = removeMarker ? removeGraphQLMarker(minified).trimStart() : minified.trimStart();
  }

  return index === partCount - 1 ? minified.trimEnd() : minified;
}

function minifyInterpolatedTemplateLiteral(
  code: string,
  node: TemplateLiteralNode,
  partRanges: Range[],
  removeMarker: boolean,
) {
  // GraphQL parsers do not understand JS `${...}` interpolation, so parse
  // the static document with valid GraphQL names and restore expressions after.
  const placeholders = node.expressions.map(
    (_, index) => `${INTERPOLATION_PLACEHOLDER_PREFIX}${index}`,
  );
  let source = "";

  for (let index = 0; index < partRanges.length; index++) {
    let part = code.slice(partRanges[index].start, partRanges[index].end);

    if (index === 0 && removeMarker) {
      part = removeGraphQLMarker(part);
    }

    source += part;

    if (index < placeholders.length) {
      source += placeholders[index];
    }
  }

  const minified = minifyGraphQLSource(source);

  if (!minified) return undefined;

  const parts = splitByPlaceholders(minified, placeholders);

  return parts.length === partRanges.length ? parts : undefined;
}

function splitByPlaceholders(source: string, placeholders: string[]) {
  const parts: string[] = [];
  let remaining = source;

  for (const placeholder of placeholders) {
    const index = remaining.indexOf(placeholder);

    if (index === -1) return [];

    parts.push(remaining.slice(0, index));
    remaining = remaining.slice(index + placeholder.length);
  }

  parts.push(remaining);

  return parts;
}

function minifyGraphQLSource(source: string) {
  try {
    return stripIgnoredCharacters(source);
  } catch {
    return undefined;
  }
}

function removeGraphQLMarker(source: string) {
  return source.replace(GRAPHQL_MARKER_RE, "");
}

function escapeTemplateLiteralText(source: string) {
  return source.replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function getTemplatePartRanges(node: TemplateLiteralNode) {
  if (node.expressions.length === 0) {
    return [
      {
        start: node.start + 1,
        end: node.end - 1,
      },
    ];
  }

  const ranges: Range[] = [];

  for (let index = 0; index <= node.expressions.length; index++) {
    const previousExpression = node.expressions[index - 1];
    const nextExpression = node.expressions[index];

    ranges.push({
      start: previousExpression ? previousExpression.end + 1 : node.start + 1,
      end: nextExpression ? nextExpression.start - 2 : node.end - 1,
    });
  }

  return ranges;
}

function applyReplacements(
  code: string,
  replacements: Replacement[],
  filename: string,
): TransformResult {
  const magicString = new MagicString(code);

  for (const replacement of replacementsByDescendingStart(replacements)) {
    magicString.overwrite(replacement.start, replacement.end, replacement.text);
  }

  return {
    code: magicString.toString(),
    map: magicString.generateMap({
      hires: false,
      includeContent: true,
      source: filename,
    }),
  };
}

function replacementsByDescendingStart(replacements: Replacement[]) {
  const sorted: Replacement[] = [];

  for (const replacement of replacements) {
    const insertionIndex = sorted.findIndex(({ start }) => replacement.start > start);

    if (insertionIndex === -1) {
      sorted.push(replacement);
    } else {
      sorted.splice(insertionIndex, 0, replacement);
    }
  }

  return sorted;
}
