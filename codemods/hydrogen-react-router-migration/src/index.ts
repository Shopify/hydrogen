import type { FileInfo, API, Options } from 'jscodeshift';
import { checkPrerequisites, getProjectInfo } from './detectors/prerequisites';
import { shouldTransformFile, analyzeFile } from './detectors/file-filter';
import { detectProjectLanguage } from './detectors/language';
import { transformRouteTypes } from './transformations/route-types';
import { transformContextAPI } from './transformations/context-api';
import { transformImports } from './transformations/imports';
import { transformComponents, addEnvironmentTypeReference } from './transformations/components';

export interface TransformOptions extends Options {
  projectRoot?: string;
  language?: ReturnType<typeof detectProjectLanguage>;
}

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: TransformOptions
): string | undefined {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  
  // Get project root (from options or derive from file path)
  const projectRoot = options.projectRoot || process.cwd();
  
  // Detect language if not provided
  const language = options.language || detectProjectLanguage(projectRoot);
  
  // Check if file should be transformed
  if (!shouldTransformFile(fileInfo.path, language)) {
    return undefined;
  }
  
  // Analyze the file
  const fileAnalysis = analyzeFile(fileInfo.path, language);
  
  let hasChanges = false;
  
  // Apply import transformations first (before other transformations)
  hasChanges = transformImports(j, root, fileInfo.path, language) || hasChanges;
  
  // Apply component transformations (after imports but before route types)
  hasChanges = transformComponents(j, root, fileInfo.path, language) || hasChanges;
  
  // Apply transformations based on file type
  if (fileAnalysis.isRoute) {
    hasChanges = transformRouteTypes(j, root, fileInfo.path, language) || hasChanges;
  }
  
  // Apply context API transformation
  if (fileAnalysis.isContext || fileAnalysis.isRoute) {
    hasChanges = transformContextAPI(j, root, fileInfo.path, language) || hasChanges;
  }
  
  // Add environment type references for .d.ts files
  if (fileInfo.path.includes('.d.ts')) {
    hasChanges = addEnvironmentTypeReference(j, root, fileInfo.path) || hasChanges;
  }
  
  if (hasChanges) {
    return root.toSource({ quote: 'single' });
  }
  
  return undefined;
}

// Export for CLI usage
export { checkPrerequisites, getProjectInfo } from './detectors/prerequisites';
export { detectProjectLanguage } from './detectors/language';
export { updatePackageJson } from './transformations/package-json';