import type { JSCodeshift, Collection } from 'jscodeshift';

export class JavaScriptStrategy {
  constructor(private j: JSCodeshift) {}
  
  addRouteTypeImport(root: Collection, routeName: string): boolean {
    // For JavaScript, we'll add JSDoc typedef comments instead of imports
    const program = root.find(this.j.Program).get();
    
    // Check if typedef already exists in the file
    const source = root.toSource();
    if (source.includes(`@typedef {import('./+types/${routeName}').Route} Route`)) {
      return false;
    }
    
    // Create the JSDoc typedef as a template
    const typedefComment = `/**
 * @typedef {import('./+types/${routeName}').Route} Route
 */`;
    
    // Find the first node in the program to insert before
    const firstNode = program.value.body[0];
    if (firstNode) {
      // Parse the comment and the first node together, then replace
      const newSource = `${typedefComment}\n${root.toSource()}`;
      const newRoot = this.j(newSource);
      
      // Replace the entire program body
      program.value.body = newRoot.find(this.j.Program).get().value.body;
      program.value.comments = newRoot.find(this.j.Program).get().value.comments;
      return true;
    }
    
    return false;
  }
  
  transformLoaderType(root: Collection): boolean {
    let hasChanges = false;
    const source = root.toSource();
    
    // Check if JSDoc already exists for any loader
    const hasExistingLoaderJSDoc = source.includes('@param {Route.LoaderArgs}') ||
                                   source.includes('@type {(args: Route.LoaderArgs)');
    
    if (hasExistingLoaderJSDoc) {
      return false;
    }
    
    // Find loader functions
    root.find(this.j.FunctionDeclaration, { id: { name: 'loader' } })
      .forEach(path => {
        // Check if JSDoc already exists
        const startLine = path.value.loc?.start.line || 0;
        const lines = source.split('\n');
        const prevLines = lines.slice(Math.max(0, startLine - 5), startLine);
        const hasJSDoc = prevLines.some(line => 
          line.includes('@param') && line.includes('Route.LoaderArgs')
        );
        
        if (!hasJSDoc) {
          hasChanges = true;
        }
      });
    
    // Handle const loader
    root.find(this.j.VariableDeclarator, { id: { name: 'loader' } })
      .forEach(path => {
        const parent = path.parent;
        if (parent.parent.value.type === 'ExportNamedDeclaration') {
          const startLine = parent.parent.value.loc?.start.line || 0;
          const lines = source.split('\n');
          const prevLines = lines.slice(Math.max(0, startLine - 5), startLine);
          const hasJSDoc = prevLines.some(line => 
            line.includes('@type') && line.includes('Route.LoaderArgs')
          );
          
          if (!hasJSDoc) {
            hasChanges = true;
          }
        }
      });
    
    // If we need to make changes, we'll do it by reconstructing the source
    if (hasChanges) {
      const lines = source.split('\n');
      const newLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line contains a loader function or const
        if ((line.includes('export async function loader') || 
             line.includes('export function loader')) &&
            !lines[i - 1]?.includes('@param')) {
          // Insert JSDoc before the function
          newLines.push('/**');
          newLines.push(' * @param {Route.LoaderArgs} args');
          newLines.push(' * @returns {Promise<Response>}');
          newLines.push(' */');
        } else if (line.includes('export const loader') &&
                   !lines[i - 1]?.includes('@type')) {
          // Insert JSDoc before the const
          newLines.push('/**');
          newLines.push(' * @type {(args: Route.LoaderArgs) => Promise<Response>}');
          newLines.push(' */');
        }
        
        newLines.push(line);
      }
      
      // Parse the new source and replace the root
      const newSource = newLines.join('\n');
      const newRoot = this.j(newSource);
      root.find(this.j.Program).replaceWith(newRoot.find(this.j.Program).get().value);
    }
    
    return hasChanges;
  }
  
  transformActionType(root: Collection): boolean {
    let hasChanges = false;
    const source = root.toSource();
    
    // Find action functions
    root.find(this.j.FunctionDeclaration, { id: { name: 'action' } })
      .forEach(path => {
        const startLine = path.value.loc?.start.line || 0;
        const lines = source.split('\n');
        const prevLine = lines[startLine - 2] || '';
        
        if (!prevLine.includes('@param') && !prevLine.includes('Route.ActionArgs')) {
          hasChanges = true;
        }
      });
    
    // Handle const action
    root.find(this.j.VariableDeclarator, { id: { name: 'action' } })
      .forEach(path => {
        const parent = path.parent;
        if (parent.parent.value.type === 'ExportNamedDeclaration') {
          hasChanges = true;
        }
      });
    
    // Apply changes by reconstructing source
    if (hasChanges) {
      const lines = source.split('\n');
      const newLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if ((line.includes('export async function action') || 
             line.includes('export function action')) &&
            !lines[i - 1]?.includes('@param')) {
          newLines.push('/**');
          newLines.push(' * @param {Route.ActionArgs} args');
          newLines.push(' * @returns {Promise<Response>}');
          newLines.push(' */');
        } else if (line.includes('export const action') &&
                   !lines[i - 1]?.includes('@type')) {
          newLines.push('/**');
          newLines.push(' * @type {(args: Route.ActionArgs) => Promise<Response>}');
          newLines.push(' */');
        }
        
        newLines.push(line);
      }
      
      const newSource = newLines.join('\n');
      const newRoot = this.j(newSource);
      root.find(this.j.Program).replaceWith(newRoot.find(this.j.Program).get().value);
    }
    
    return hasChanges;
  }
  
  transformMetaType(root: Collection): boolean {
    let hasChanges = false;
    const source = root.toSource();
    
    // Check if JSDoc already exists for meta
    if (source.includes('@type {Route.MetaFunction}')) {
      return false;
    }
    
    // Find meta exports
    root.find(this.j.VariableDeclarator, { id: { name: 'meta' } })
      .forEach(path => {
        const parent = path.parent;
        if (parent.parent.value.type === 'ExportNamedDeclaration') {
          const startLine = parent.parent.value.loc?.start.line || 0;
          const lines = source.split('\n');
          const prevLines = lines.slice(Math.max(0, startLine - 5), startLine);
          const hasJSDoc = prevLines.some(line => 
            line.includes('@type') && line.includes('Route.MetaFunction')
          );
          
          if (!hasJSDoc) {
            hasChanges = true;
          }
        }
      });
    
    // Apply changes
    if (hasChanges) {
      const lines = source.split('\n');
      const newLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('export const meta') &&
            !lines[i - 1]?.includes('@type')) {
          newLines.push('/**');
          newLines.push(' * @type {Route.MetaFunction}');
          newLines.push(' */');
        }
        
        newLines.push(line);
      }
      
      const newSource = newLines.join('\n');
      const newRoot = this.j(newSource);
      root.find(this.j.Program).replaceWith(newRoot.find(this.j.Program).get().value);
    }
    
    return hasChanges;
  }
  
  addErrorTypeAnnotation(root: Collection): boolean {
    let hasChanges = false;
    const source = root.toSource();
    
    // Check if any catch clauses already have error annotations (block or line comments)
    const hasExistingErrorAnnotation = source.includes('@param {Error');
    
    if (hasExistingErrorAnnotation) {
      return false;
    }
    
    root.find(this.j.CatchClause).forEach(path => {
      if (path.value.param && path.value.param.type === 'Identifier') {
        const startLine = path.value.loc?.start.line || 0;
        const lines = source.split('\n');
        const catchLine = lines[startLine - 1] || '';
        const nextLines = lines.slice(startLine, Math.min(lines.length, startLine + 3));
        
        // Check if there's already a type annotation comment (inline, above, or inside)
        const hasAnnotation = catchLine.includes('@param {Error') || 
                            nextLines.some(line => line.includes('@param {Error'));
        
        if (!hasAnnotation) {
          hasChanges = true;
        }
      }
    });
    
    if (hasChanges) {
      const lines = source.split('\n');
      const newLines: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line contains a catch clause
        const catchMatch = line.match(/} catch \((\w+)\) {/);
        if (catchMatch && !line.includes('/** @param {Error}')) {
          // Insert inline JSDoc
          const paramName = catchMatch[1];
          newLines.push(line.replace(
            `} catch (${paramName}) {`,
            `} catch (/** @param {Error} */ ${paramName}) {`
          ));
        } else {
          newLines.push(line);
        }
      }
      
      const newSource = newLines.join('\n');
      const newRoot = this.j(newSource);
      root.find(this.j.Program).replaceWith(newRoot.find(this.j.Program).get().value);
    }
    
    return hasChanges;
  }
  
  addContextTypeDefinition(root: Collection, properties: any[]): void {
    // For JavaScript, add JSDoc typedef for additional context
    const propDefs = properties.map(prop => {
      if (prop.type === 'Property' && prop.key.type === 'Identifier') {
        return ` * @property {*} ${prop.key.name}`;
      }
      return null;
    }).filter(Boolean).join('\n');
    
    const typedefComment = `/**
 * @typedef {Object} AdditionalContext
${propDefs}
 */`;
    
    // Insert at the top of the file
    const source = root.toSource();
    const newSource = `${typedefComment}\n${source}`;
    const newRoot = this.j(newSource);
    root.find(this.j.Program).replaceWith(newRoot.find(this.j.Program).get().value);
  }
}