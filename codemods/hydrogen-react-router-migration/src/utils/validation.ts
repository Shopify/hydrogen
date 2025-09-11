import fs from 'fs';
import path from 'path';
import type { Collection, JSCodeshift } from 'jscodeshift';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validatePreTransform(
  projectRoot: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    errors.push('package.json not found in project root');
    return { valid: false, errors, warnings };
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // Check for React Router 7.8.x already installed
    const hasReactRouter = 
      packageJson.dependencies?.['react-router'] ||
      packageJson.devDependencies?.['react-router'];
    
    if (hasReactRouter) {
      const version = packageJson.dependencies?.['react-router'] || 
                     packageJson.devDependencies?.['react-router'];
      
      if (version.includes('7.8')) {
        warnings.push('React Router 7.8.x already installed - some transformations may be redundant');
      }
    }
    
    // Check for Remix dependencies (should be removed by official codemod)
    const remixDeps = [
      '@remix-run/react',
      '@remix-run/node',
      '@remix-run/dev'
    ];
    
    const hasRemixDeps = remixDeps.some(dep => 
      packageJson.dependencies?.[dep] || 
      packageJson.devDependencies?.[dep]
    );
    
    if (hasRemixDeps) {
      warnings.push(
        'Remix dependencies detected. Ensure you have run the official ' +
        'Remix to React Router migration codemod first.'
      );
    }
    
    // Check for Hydrogen version
    const hydrogenVersion = packageJson.dependencies?.['@shopify/hydrogen'];
    if (!hydrogenVersion) {
      errors.push('@shopify/hydrogen not found in dependencies');
    } else if (!hydrogenVersion.includes('2025')) {
      warnings.push(
        `Hydrogen version ${hydrogenVersion} detected. ` +
        'This codemod is designed for Hydrogen 2025.x versions.'
      );
    }
    
  } catch (error) {
    errors.push(`Failed to parse package.json: ${error}`);
  }
  
  // Check for TypeScript configuration
  const tsConfigPath = path.join(projectRoot, 'tsconfig.json');
  const hasTypeScript = fs.existsSync(tsConfigPath);
  
  if (hasTypeScript) {
    try {
      const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath, 'utf-8'));
      
      // Check for strict mode
      if (!tsConfig.compilerOptions?.strict) {
        warnings.push(
          'TypeScript strict mode is not enabled. ' +
          'Some type transformations may cause compilation errors.'
        );
      }
    } catch (error) {
      warnings.push('Failed to parse tsconfig.json');
    }
  }
  
  // Check for app directory structure
  const appDir = path.join(projectRoot, 'app');
  if (!fs.existsSync(appDir)) {
    errors.push('app directory not found - expected Hydrogen/Remix app structure');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validatePostTransform(
  j: JSCodeshift,
  root: Collection,
  filePath: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for conflicting imports
  const imports = new Map<string, string[]>();
  
  root.find(j.ImportDeclaration).forEach(path => {
    const source = path.value.source.value as string;
    const specifiers = path.value.specifiers?.map(s => {
      if (s.type === 'ImportSpecifier') {
        return s.imported?.name;
      } else if (s.type === 'ImportDefaultSpecifier') {
        return 'default';
      } else if (s.type === 'ImportNamespaceSpecifier') {
        return '*';
      }
      return null;
    }).filter(Boolean) as string[] || [];
    
    if (!imports.has(source)) {
      imports.set(source, []);
    }
    imports.get(source)!.push(...specifiers);
  });
  
  // Check for duplicate imports
  imports.forEach((specifiers, source) => {
    const duplicates = specifiers.filter((item, index) => 
      specifiers.indexOf(item) !== index
    );
    
    if (duplicates.length > 0) {
      warnings.push(
        `Duplicate imports from '${source}' in ${filePath}: ${duplicates.join(', ')}`
      );
    }
  });
  
  // Check for mixed import styles (should not have both Remix and React Router)
  const hasRemixImports = Array.from(imports.keys()).some(s => 
    s.includes('@remix-run')
  );
  const hasReactRouterImports = Array.from(imports.keys()).some(s => 
    s === 'react-router'
  );
  
  if (hasRemixImports && hasReactRouterImports) {
    warnings.push(
      `Mixed imports detected in ${filePath}: ` +
      'Both @remix-run and react-router imports present'
    );
  }
  
  // Check for orphaned type imports
  root.find(j.TSTypeReference).forEach(path => {
    const typeName = path.value.typeName;
    if (typeName.type === 'TSQualifiedName') {
      const left = typeName.left;
      if (left.type === 'Identifier' && left.name === 'Route') {
        // Ensure Route type is imported
        const hasRouteImport = root.find(j.ImportSpecifier, {
          imported: { name: 'Route' }
        }).length > 0;
        
        if (!hasRouteImport) {
          // Check if using the new import style
          const hasTypesImport = imports.has(`./+types/${path.scope.path.join('/')}`);
          if (!hasTypesImport) {
            errors.push(
              `Missing Route type import for ${('name' in typeName.right ? typeName.right.name : 'unknown')} in ${filePath}`
            );
          }
        }
      }
    }
  });
  
  // Validate JSX elements
  root.find(j.JSXElement).forEach(path => {
    const opening = path.value.openingElement;
    const closing = path.value.closingElement;
    
    if (closing && opening.name.type === 'JSXIdentifier' && 
        closing.name.type === 'JSXIdentifier') {
      if (opening.name.name !== closing.name.name) {
        errors.push(
          `Mismatched JSX tags in ${filePath}: ` +
          `<${opening.name.name}> ... </${closing.name.name}>`
        );
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateFileIntegrity(
  original: string,
  transformed: string,
  filePath: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for syntax errors by trying to parse
  const j = require('jscodeshift').withParser('tsx');
  
  try {
    j(transformed);
  } catch (error) {
    errors.push(`Syntax error in transformed file ${filePath}: ${error}`);
    return { valid: false, errors, warnings };
  }
  
  // Count critical elements
  const originalExports = (original.match(/export\s+(default|function|const|class|interface|type)/g) || []).length;
  const transformedExports = (transformed.match(/export\s+(default|function|const|class|interface|type)/g) || []).length;
  
  if (originalExports > transformedExports) {
    warnings.push(
      `Export count decreased in ${filePath}: ` +
      `${originalExports} → ${transformedExports}`
    );
  }
  
  // Check for lost functions
  const originalFunctions = (original.match(/function\s+\w+/g) || []).length;
  const transformedFunctions = (transformed.match(/function\s+\w+/g) || []).length;
  
  if (originalFunctions > transformedFunctions + 2) { // Allow some consolidation
    warnings.push(
      `Function count significantly decreased in ${filePath}: ` +
      `${originalFunctions} → ${transformedFunctions}`
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function createValidationReport(
  results: Map<string, ValidationResult>
): string {
  const report: string[] = ['Validation Report:', ''];
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithErrors = 0;
  let filesWithWarnings = 0;
  
  results.forEach((result, file) => {
    if (result.errors.length > 0) {
      filesWithErrors++;
      totalErrors += result.errors.length;
      
      report.push(`❌ ${file}:`);
      result.errors.forEach(error => {
        report.push(`   ERROR: ${error}`);
      });
    }
    
    if (result.warnings.length > 0) {
      filesWithWarnings++;
      totalWarnings += result.warnings.length;
      
      if (result.errors.length === 0) {
        report.push(`⚠️  ${file}:`);
      }
      result.warnings.forEach(warning => {
        report.push(`   WARN: ${warning}`);
      });
    }
    
    if (result.errors.length > 0 || result.warnings.length > 0) {
      report.push('');
    }
  });
  
  report.push('Summary:');
  report.push(`  Files processed: ${results.size}`);
  report.push(`  Files with errors: ${filesWithErrors}`);
  report.push(`  Files with warnings: ${filesWithWarnings}`);
  report.push(`  Total errors: ${totalErrors}`);
  report.push(`  Total warnings: ${totalWarnings}`);
  
  if (totalErrors === 0) {
    report.push('');
    report.push('✅ All validations passed!');
  }
  
  return report.join('\n');
}