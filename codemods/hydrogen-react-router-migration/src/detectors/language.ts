import fs from 'fs';
import path from 'path';

export interface ProjectLanguage {
  isTypeScript: boolean;
  hasTypeScriptDependency: boolean;
  hasTsConfig: boolean;
  fileExtensions: {
    primary: '.ts' | '.js';
    component: '.tsx' | '.jsx';
  };
  routeFilePattern: string;
  majorityLanguage: 'typescript' | 'javascript' | 'mixed';
}

export function detectProjectLanguage(projectRoot: string): ProjectLanguage {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const appDir = path.join(projectRoot, 'app');
  
  // Check for TypeScript dependency
  let hasTypeScriptDependency = false;
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };
    hasTypeScriptDependency = !!allDeps.typescript;
  }
  
  // Check for tsconfig.json
  const hasTsConfig = fs.existsSync(tsconfigPath);
  
  // Analyze files in app directory
  const fileStats = analyzeFileTypes(appDir);
  
  // Determine if this is primarily a TypeScript project
  const isTypeScript = (hasTsConfig || hasTypeScriptDependency) && 
                       fileStats.typescript >= fileStats.javascript;
  
  // Determine majority language
  let majorityLanguage: 'typescript' | 'javascript' | 'mixed';
  if (fileStats.typescript === 0 && fileStats.javascript > 0) {
    majorityLanguage = 'javascript';
  } else if (fileStats.javascript === 0 && fileStats.typescript > 0) {
    majorityLanguage = 'typescript';
  } else if (fileStats.typescript > fileStats.javascript * 2) {
    majorityLanguage = 'typescript';
  } else if (fileStats.javascript > fileStats.typescript * 2) {
    majorityLanguage = 'javascript';
  } else {
    majorityLanguage = 'mixed';
  }
  
  return {
    isTypeScript,
    hasTypeScriptDependency,
    hasTsConfig,
    fileExtensions: {
      primary: isTypeScript ? '.ts' : '.js',
      component: isTypeScript ? '.tsx' : '.jsx'
    },
    routeFilePattern: isTypeScript ? '**/*.{ts,tsx}' : '**/*.{js,jsx}',
    majorityLanguage
  };
}

interface FileStats {
  typescript: number;
  javascript: number;
  total: number;
}

function analyzeFileTypes(directory: string): FileStats {
  const stats: FileStats = {
    typescript: 0,
    javascript: 0,
    total: 0
  };
  
  if (!fs.existsSync(directory)) {
    return stats;
  }
  
  function traverse(dir: string) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        traverse(filePath);
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (['.ts', '.tsx'].includes(ext)) {
          stats.typescript++;
          stats.total++;
        } else if (['.js', '.jsx'].includes(ext)) {
          stats.javascript++;
          stats.total++;
        }
      }
    }
  }
  
  traverse(directory);
  return stats;
}

export function getTransformationStrategy(language: ProjectLanguage) {
  return {
    addTypeImport(importPath: string, typeName: string): string {
      if (language.isTypeScript) {
        return `import type {${typeName}} from '${importPath}';`;
      } else {
        return `/** @typedef {import('${importPath}').${typeName}} ${typeName} */`;
      }
    },
    
    addTypeAnnotation(paramName: string, typePath: string): string {
      if (language.isTypeScript) {
        return `${paramName}: ${typePath}`;
      } else {
        return `/** @param {${typePath}} ${paramName} */\n${paramName}`;
      }
    },
    
    addReturnType(functionName: string, returnType: string): string {
      if (language.isTypeScript) {
        return `${functionName}(): ${returnType}`;
      } else {
        return `/** @returns {${returnType}} */\n${functionName}()`;
      }
    },
    
    shouldUpdateTsConfig(): boolean {
      return language.isTypeScript && language.hasTsConfig;
    },
    
    getConfigFileName(): string {
      return language.isTypeScript ? 'react-router.config.ts' : 'react-router.config.js';
    }
  };
}