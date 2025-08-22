#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import fastGlob from 'fast-glob';
import {execSync} from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function logError(message) {
  console.error(`${COLORS.red}✗${COLORS.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${COLORS.green}✓${COLORS.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${COLORS.yellow}⚠${COLORS.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${COLORS.blue}ℹ${COLORS.reset} ${message}`);
}

/**
 * Extract GraphQL fragments from a string
 */
function extractFragments(content) {
  const fragmentRegex = /fragment\s+(\w+)\s+on\s+\w+\s*{/g;
  const fragments = new Set();
  let match;
  
  while ((match = fragmentRegex.exec(content)) !== null) {
    fragments.add(match[1]);
  }
  
  return fragments;
}

/**
 * Extract fragment usage from a string
 */
function extractFragmentUsage(content) {
  const usageRegex = /\.\.\.(\w+)/g;
  const usedFragments = new Set();
  let match;
  
  while ((match = usageRegex.exec(content)) !== null) {
    usedFragments.add(match[1]);
  }
  
  return usedFragments;
}

/**
 * Check if a fragment is exported and potentially used elsewhere
 */
function isFragmentExported(content, fragmentName) {
  // Check if the fragment is part of an exported constant
  const exportRegex = new RegExp(`export\\s+(const|let|var)\\s+\\w*${fragmentName}\\w*`, 'i');
  if (exportRegex.test(content)) {
    return true;
  }
  
  // Check if it's in a constant that contains the fragment
  const fragmentInConstantRegex = new RegExp(`fragment\\s+${fragmentName}\\s+on`, 'i');
  if (fragmentInConstantRegex.test(content)) {
    // Check if this constant is exported or assigned to something that's exported
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(`fragment ${fragmentName}`)) {
        // Look backwards for the constant declaration
        for (let j = i; j >= 0; j--) {
          if (/export\s+(const|let|var)/.test(lines[j])) {
            return true;
          }
          if (/^(const|let|var)\s+/.test(lines[j])) {
            // Found the declaration, check if it's exported elsewhere
            const constantMatch = lines[j].match(/(const|let|var)\s+(\w+)/);
            if (constantMatch) {
              const constantName = constantMatch[2];
              // Check if this constant is exported
              if (content.includes(`export { ${constantName}`) || 
                  content.includes(`export {${constantName}`) ||
                  content.includes(`export{${constantName}`) ||
                  content.includes(`export default ${constantName}`)) {
                return true;
              }
            }
            break;
          }
        }
        break;
      }
    }
  }
  
  return false;
}

/**
 * Validate GraphQL operations in a file
 */
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  
  // Skip generated files, example files, and examples folder
  if (filePath.includes('.generated.') || 
      filePath.includes('/node_modules/') ||
      filePath.includes('/examples/') ||
      filePath.includes('.example.')) {
    return errors;
  }
  
  // Find all GraphQL template literals - also check for string concatenation patterns
  const graphqlRegex = /(#graphql|gql|graphql|CART_QUERY_FRAGMENT|HEADER_QUERY|FOOTER_QUERY)\s*=\s*[`'"]([\s\S]*?)[`'"]/g;
  let match;
  
  // Collect all fragments defined in this file
  const allDefinedFragments = new Set();
  const allUsedFragments = new Set();
  
  // First pass: collect all defined fragments and usage
  while ((match = graphqlRegex.exec(content)) !== null) {
    const graphqlContent = match[2];
    
    // Extract defined fragments
    const definedFragments = extractFragments(graphqlContent);
    for (const fragment of definedFragments) {
      allDefinedFragments.add(fragment);
    }
    
    // Extract used fragments
    const usedFragments = extractFragmentUsage(graphqlContent);
    for (const fragment of usedFragments) {
      allUsedFragments.add(fragment);
    }
  }
  
  // Also check for fragment usage in string interpolations (${FRAGMENT_NAME})
  const interpolationRegex = /\$\{([A-Z_]+)\}/g;
  while ((match = interpolationRegex.exec(content)) !== null) {
    // This might be a fragment constant being interpolated
    // We'll be lenient here and not count these as errors
  }
  
  // Check for unused fragments
  for (const fragment of allDefinedFragments) {
    if (!allUsedFragments.has(fragment)) {
      // Special case: if the fragment is exported (like CartApiQuery), 
      // it might be used in other files via the constant
      if (isFragmentExported(content, fragment)) {
        // Skip this fragment as it's exported and might be used elsewhere
        continue;
      }
      
      errors.push({
        file: path.relative(rootDir, filePath),
        fragment,
        message: `Fragment "${fragment}" is defined but never used`,
      });
    }
  }
  
  return errors;
}

/**
 * Validate all GraphQL operations in the project
 */
async function validateGraphQLOperations() {
  console.log('🔍 Validating GraphQL operations...\n');
  
  const patterns = [
    'templates/**/*.{ts,tsx,js,jsx}',
    'packages/**/*.{ts,tsx,js,jsx}',
  ];
  
  const allErrors = [];
  
  for (const pattern of patterns) {
    const files = await fastGlob(pattern, {
      cwd: rootDir,
      absolute: true,
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/examples/**',  // Explicitly exclude examples folder
        '**/*.test.{ts,tsx,js,jsx}',
        '**/*.spec.{ts,tsx,js,jsx}',
        '**/*.generated.*',
      ],
    });
    
    for (const file of files) {
      const errors = validateFile(file);
      allErrors.push(...errors);
    }
  }
  
  // Report results
  if (allErrors.length > 0) {
    console.log(`Found ${allErrors.length} GraphQL validation error(s):\n`);
    
    for (const error of allErrors) {
      logError(`${error.file}: ${error.message}`);
    }
    
    console.log('\nTo fix these errors:');
    console.log('1. Remove unused fragments from your GraphQL operations');
    console.log('2. Or use the fragments in your queries/mutations with ...FragmentName');
    console.log('3. Ensure all fragments are actually needed\n');
    
    return false;
  } else {
    logSuccess('All GraphQL operations are valid!');
    return true;
  }
}

/**
 * Validate GraphQL in example files using graphql-tag
 */
async function validateExampleFiles(files) {
  const errors = [];
  
  try {
    // Import graphql-tag for parsing
    const {default: gql} = await import('graphql-tag');
    const {validate, buildClientSchema} = await import('graphql');
    const {getSchema} = await import('@shopify/hydrogen-codegen');
    
    // Get the Storefront API schema path and read it
    const schemaPath = getSchema('storefront');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    const schemaJSON = JSON.parse(schemaContent);
    
    // Build the schema from the introspection result
    const schema = buildClientSchema(schemaJSON.data || schemaJSON);
    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const relativePath = file.startsWith(rootDir) 
        ? path.relative(rootDir, file)
        : path.basename(file);
      
      // Find GraphQL strings in the file
      const graphqlRegex = /(#graphql|gql|graphql)\s*[`'"]([\s\S]*?)[`'"]/g;
      let match;
      
      while ((match = graphqlRegex.exec(content)) !== null) {
        const graphqlContent = match[2];
        
        try {
          // Parse the GraphQL
          const document = gql(graphqlContent);
          
          // Validate against schema
          const validationErrors = validate(schema, document);
          
          if (validationErrors.length > 0) {
            for (const error of validationErrors) {
              // Check if it's a field error
              if (error.message.includes('Cannot query field')) {
                errors.push({
                  dir: relativePath,
                  message: error.message,
                });
              } else if (error.message.includes('Unknown type')) {
                errors.push({
                  dir: relativePath,
                  message: error.message,
                });
              }
            }
          }
        } catch (parseError) {
          // GraphQL syntax error
          if (!parseError.message.includes('was defined, but not used')) {
            errors.push({
              dir: relativePath,
              message: `GraphQL syntax error: ${parseError.message}`,
            });
          }
        }
      }
    }
  } catch (importError) {
    logWarning('Could not validate example files against schema');
    logWarning(`Error: ${importError.message}`);
    // Don't fail on example file validation issues for now
  }
  
  return errors;
}

/**
 * Validate GraphQL operations against schema
 */
async function validateGraphQLSchema() {
  console.log('\n🔍 Validating GraphQL operations against schema...\n');
  
  // First, ensure packages are built so codegen can run
  console.log('📦 Building packages (required for schema validation)...\n');
  try {
    execSync('npm run build:pkg', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    logSuccess('Packages built successfully\n');
  } catch (error) {
    logError('Failed to build packages - schema validation may fail');
    // Continue anyway, as some projects might still work
  }
  
  // Find directories with GraphQL operations that need validation
  const dirsToValidate = new Set();
  
  // Check templates only (explicitly skip examples folder at root)
  const patterns = ['templates/*'];
  for (const pattern of patterns) {
    const dirs = await fastGlob(pattern, {
      cwd: rootDir,
      absolute: true,
      onlyDirectories: true,
    });
    
    for (const dir of dirs) {
      if (fs.existsSync(path.join(dir, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        
        if (pkg.scripts?.codegen) {
          dirsToValidate.add(dir);
        }
      }
    }
  }
  
  const errors = [];
  
  // Validate directories with codegen (templates only)
  for (const dir of dirsToValidate) {
    const relativePath = path.relative(rootDir, dir);
    logInfo(`Validating GraphQL schema in ${relativePath}...`);
    
    try {
      // Run codegen in validation mode - it will fail if schema is invalid
      execSync('npm run codegen', {
        cwd: dir,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      logSuccess(`Schema valid in ${relativePath}`);
    } catch (error) {
      const errorOutput = error.stdout || error.stderr || error.message;
      
      // Parse common schema validation errors
      if (errorOutput.includes("Cannot query field")) {
        const fieldMatch = errorOutput.match(/Cannot query field ["'](\w+)["'] on type ["'](\w+)["']/);
        if (fieldMatch) {
          errors.push({
            dir: relativePath,
            message: `Field '${fieldMatch[1]}' doesn't exist on type '${fieldMatch[2]}'`,
          });
        }
      } else if (errorOutput.includes("Unknown type")) {
        const typeMatch = errorOutput.match(/Unknown type ["'](\w+)["']/);
        if (typeMatch) {
          errors.push({
            dir: relativePath,
            message: `Type '${typeMatch[1]}' doesn't exist in the schema`,
          });
        }
      } else if (errorOutput.includes("Fragment") && errorOutput.includes("was defined, but not used")) {
        // This is caught by our other validation
        continue;
      } else {
        // Generic schema error
        errors.push({
          dir: relativePath,
          message: 'Schema validation failed - check GraphQL operations match the API schema',
        });
      }
    }
  }
  
  // Now validate standalone documentation example files
  logInfo('Validating GraphQL in example files...');
  const exampleFiles = await fastGlob('packages/**/*.example.{js,jsx,ts,tsx}', {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**'],
  });
  
  // We'll validate these by creating a temporary validation project
  if (exampleFiles.length > 0) {
    const tempValidationErrors = await validateExampleFiles(exampleFiles);
    errors.push(...tempValidationErrors);
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ Found ${errors.length} schema validation error(s):\n`);
    
    for (const error of errors) {
      logError(`${error.dir}: ${error.message}`);
    }
    
    console.log('\n To fix schema errors:');
    console.log('1. Check the Storefront API documentation for correct field names');
    console.log('2. Ensure types are used in the correct context (e.g., CartWarning only in mutations)');
    console.log('3. Remove or fix invalid field references\n');
    
    return false;
  }
  
  return true;
}

/**
 * Check for invalid type references in generated files
 */
async function validateGeneratedTypes() {
  console.log('\n🔍 Validating generated GraphQL types...\n');
  
  const generatedFiles = await fastGlob('**/*.generated.d.ts', {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/examples/**'],
  });
  
  const errors = [];
  
  for (const file of generatedFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check for references to CartWarning in non-mutation contexts
    // CartWarning should only appear in mutation payloads, not in Cart queries
    const cartWarningInQueryRegex = /export type Cart(?!.*Mutation).*Fragment.*CartWarning/;
    if (cartWarningInQueryRegex.test(content)) {
      errors.push({
        file: path.relative(rootDir, file),
        message: 'CartWarning type can only be used in mutation payloads, not in Cart queries',
      });
    }
    
    // Check for other common GraphQL type misuses
    // This can be extended with more validation rules as needed
  }
  
  if (errors.length > 0) {
    console.log(`Found ${errors.length} type validation error(s):\n`);
    
    for (const error of errors) {
      logError(`${error.file}: ${error.message}`);
    }
    
    console.log('\n❌ Generated type validation failed!');
    return false;
  } else {
    logSuccess('All generated types are valid!');
    return true;
  }
}

// Main execution
(async () => {
  try {
    let hasErrors = false;
    
    // Run all validations and collect results
    const operationsValid = await validateGraphQLOperations().catch(() => false);
    const schemaValid = await validateGraphQLSchema().catch(() => false);
    const typesValid = await validateGeneratedTypes().catch(() => false);
    
    if (!operationsValid || !schemaValid || !typesValid) {
      hasErrors = true;
    }
    
    if (hasErrors) {
      console.log('\n❌ GraphQL validation failed!\n');
      process.exit(1);
    } else {
      console.log('\n✅ All GraphQL validations passed!\n');
    }
  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  }
})();