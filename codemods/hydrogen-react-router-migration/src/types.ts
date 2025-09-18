import type { Collection, JSCodeshift } from 'jscodeshift';

export interface TransformationResult {
  hasChanges: boolean;
  errors?: string[];
}

export interface PrerequisiteResult {
  ready: boolean;
  message?: string;
  details?: {
    hasRemixDeps: boolean;
    hasReactRouter: boolean;
    hydrogenVersion?: string;
    reactRouterVersion?: string;
  };
}

export type TransformFunction = (
  j: JSCodeshift,
  root: Collection,
  filePath: string
) => boolean;