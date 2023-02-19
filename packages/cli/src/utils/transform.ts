import j, {type Collection, type JSCodeshift} from 'jscodeshift';
import {format, resolveFormatConfig} from './transpile-ts.js';
import {file} from '@shopify/cli-kit';
import {diffLines, Change} from 'diff';

export type Transform = (
  j: JSCodeshift,
  source: Collection<any>,
  sourcePath: string,
) => string;

type Result =
  | {
      before: string;
      after: string;
      state: 'unchanged';
      diff: never;
    }
  | {
      before: string;
      after: string;
      state: 'changed';
      diff: Change[];
    };

type Results = Map<string, Result>;

export async function applyTransform(
  transform: Transform[] | Transform,
  files: string[],
): Promise<Results> {
  const results = new Map();
  const transforms = Array.isArray(transform) ? transform : [transform];
  const jscodeshift = j.withParser('tsx');

  for (const filename of files) {
    const source = await file.read(filename);

    let newSource = source;

    for (const t of transforms) {
      newSource = t(jscodeshift, jscodeshift(newSource), filename) || newSource;
    }

    const formattedContent = await format(
      newSource,
      await resolveFormatConfig(filename),
      filename,
    );

    const changed = source !== formattedContent;
    const diff = changed ? diffLines(source, formattedContent) : null;

    results.set(filename, {
      before: source,
      after: formattedContent,
      diff,
      state: changed ? ('changed' as const) : ('unchanged' as const),
    });
  }

  return results;
}
