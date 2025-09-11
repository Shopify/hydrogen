import type { FileInfo, API, Options } from 'jscodeshift';
import { checkPrerequisites, getProjectInfo } from './detectors/prerequisites';
import { shouldTransformFile, analyzeFile } from './detectors/file-filter';
import { detectProjectLanguage } from './detectors/language';
import { transformRouteTypes } from './transformations/route-types';

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
  
  // Apply transformations based on file type
  if (fileAnalysis.isRoute) {
    hasChanges = transformRouteTypes(j, root, fileInfo.path, language) || hasChanges;
  }
  
  // TODO: Apply more transformations in subsequent milestones
  // if (fileAnalysis.isContext) {
  //   hasChanges = transformContextAPI(j, root, fileInfo.path, language) || hasChanges;
  // }
  // hasChanges = transformImports(j, root, language) || hasChanges;
  
  // Temporary: Basic transformation for context files
  if (fileAnalysis.isContext) {
    root.find(j.Identifier, { name: 'createAppLoadContext' })
      .forEach(path => {
        if (path.parent.value.type !== 'FunctionDeclaration') {
          path.value.name = 'createHydrogenRouterContext';
          hasChanges = true;
        }
      });
  }
  
  if (hasChanges) {
    return root.toSource({ quote: 'single' });
  }
  
  return undefined;
}

// Export for CLI usage
export { checkPrerequisites, getProjectInfo } from './detectors/prerequisites';
export { detectProjectLanguage } from './detectors/language';