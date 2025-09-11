import type { FileInfo, API, Options } from 'jscodeshift';
import { checkPrerequisites, getProjectInfo } from './detectors/prerequisites';
import { shouldTransformFile, analyzeFile } from './detectors/file-filter';
import { detectProjectLanguage } from './detectors/language';
import { requireReactRouterMigration } from './detectors/react-router-applied';
import { checkGitStatus, formatGitStatusError } from './detectors/git-status';
import { transformRouteTypes } from './transformations/route-types';
import { transformContextAPI } from './transformations/context-api';
import { transformImports } from './transformations/imports';
import { transformComponents, addEnvironmentTypeReference } from './transformations/components';
import { transformResponseUtilities } from './transformations/response-utilities';

export interface TransformOptions extends Options {
  projectRoot?: string;
  language?: ReturnType<typeof detectProjectLanguage>;
  skipReactRouterCheck?: boolean; // For testing
  skipGitCheck?: boolean; // For testing
}

// Track if we've already checked for React Router migration for a specific project
const checkedProjects = new Set<string>();

// Track if we've already checked git status for a specific project
const checkedGitStatus = new Set<string>();

// Reset function for testing
export function resetReactRouterCheck(): void {
  checkedProjects.clear();
  checkedGitStatus.clear();
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
  
  // Check git status only once per project root (unless skipped for testing)
  if (!checkedGitStatus.has(projectRoot) && !options.skipGitCheck) {
    const gitStatus = checkGitStatus(projectRoot);
    checkedGitStatus.add(projectRoot);
    
    if (gitStatus.hasUncommittedChanges) {
      const errorMessage = formatGitStatusError(gitStatus);
      
      // In test environment, re-throw the error
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        throw new Error(errorMessage);
      }
      // In production, log and exit
      console.error('\n' + errorMessage);
      process.exit(1);
    }
  }
  
  // Check React Router migration only once per project root (unless skipped for testing)
  if (!checkedProjects.has(projectRoot) && !options.skipReactRouterCheck) {
    try {
      requireReactRouterMigration(projectRoot);
      checkedProjects.add(projectRoot);
    } catch (error) {
      // In test environment, re-throw the error
      if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
        throw error;
      }
      // In production, log and exit
      console.error('\n' + (error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  }
  
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
  
  // Apply response utilities transformation (after imports, to handle json/defer calls)
  hasChanges = transformResponseUtilities(j, root, fileInfo.path, language) || hasChanges;
  
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