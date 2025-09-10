import type { JSCodeshift, Collection } from 'jscodeshift';

export class JavaScriptStrategy {
  constructor(private j: JSCodeshift) {}
  
  addRouteTypeImport(root: Collection, routeName: string): boolean {
    // For JavaScript, we'll add JSDoc typedef comments instead of imports
    const typedefComment = this.j.commentBlock(`*
 * @typedef {import('./+types/${routeName}').Route} Route
 */`);
    
    // Check if typedef already exists
    const program = root.find(this.j.Program).get();
    const hasTypedef = program.value.comments?.some((comment: any) => 
      comment.value.includes(`@typedef`) && 
      comment.value.includes(`/+types/${routeName}`)
    );
    
    if (!hasTypedef) {
      // Add typedef comment at the top of the file after any existing comments
      if (!program.value.comments) {
        program.value.comments = [];
      }
      program.value.comments.push(typedefComment);
      return true;
    }
    
    return false;
  }
  
  transformLoaderType(root: Collection): boolean {
    let hasChanges = false;
    
    // Find loader functions and add JSDoc comments
    root.find(this.j.FunctionDeclaration, { id: { name: 'loader' } })
      .forEach(path => {
        const func = path.value;
        
        // Check if JSDoc already exists
        const hasJSDoc = func.leadingComments?.some((comment: any) => 
          comment.type === 'CommentBlock' && 
          comment.value.includes('@param')
        );
        
        if (!hasJSDoc) {
          const jsDocComment = this.j.commentBlock(`*
 * @param {Route.LoaderArgs} args
 * @returns {Promise<Response>}
 */`);
          
          if (!func.leadingComments) {
            func.leadingComments = [];
          }
          func.leadingComments.push(jsDocComment);
          hasChanges = true;
        }
      });
    
    // Also handle exported const loader = async () => {}
    root.find(this.j.VariableDeclarator, { id: { name: 'loader' } })
      .forEach(path => {
        const parent = path.parent.value;
        
        // Check if JSDoc already exists
        const hasJSDoc = parent.leadingComments?.some((comment: any) => 
          comment.type === 'CommentBlock' && 
          comment.value.includes('@param')
        );
        
        if (!hasJSDoc) {
          const jsDocComment = this.j.commentBlock(`*
 * @type {(args: Route.LoaderArgs) => Promise<Response>}
 */`);
          
          if (!parent.leadingComments) {
            parent.leadingComments = [];
          }
          parent.leadingComments.push(jsDocComment);
          hasChanges = true;
        }
      });
    
    return hasChanges;
  }
  
  transformActionType(root: Collection): boolean {
    let hasChanges = false;
    
    // Find action functions and add JSDoc comments
    root.find(this.j.FunctionDeclaration, { id: { name: 'action' } })
      .forEach(path => {
        const func = path.value;
        
        const hasJSDoc = func.leadingComments?.some((comment: any) => 
          comment.type === 'CommentBlock' && 
          comment.value.includes('@param')
        );
        
        if (!hasJSDoc) {
          const jsDocComment = this.j.commentBlock(`*
 * @param {Route.ActionArgs} args
 * @returns {Promise<Response>}
 */`);
          
          if (!func.leadingComments) {
            func.leadingComments = [];
          }
          func.leadingComments.push(jsDocComment);
          hasChanges = true;
        }
      });
    
    // Handle exported const action
    root.find(this.j.VariableDeclarator, { id: { name: 'action' } })
      .forEach(path => {
        const parent = path.parent.value;
        
        const hasJSDoc = parent.leadingComments?.some((comment: any) => 
          comment.type === 'CommentBlock' && 
          comment.value.includes('@type')
        );
        
        if (!hasJSDoc) {
          const jsDocComment = this.j.commentBlock(`*
 * @type {(args: Route.ActionArgs) => Promise<Response>}
 */`);
          
          if (!parent.leadingComments) {
            parent.leadingComments = [];
          }
          parent.leadingComments.push(jsDocComment);
          hasChanges = true;
        }
      });
    
    return hasChanges;
  }
  
  transformMetaType(root: Collection): boolean {
    let hasChanges = false;
    
    // Find meta exports and add JSDoc comments
    root.find(this.j.VariableDeclarator, { id: { name: 'meta' } })
      .forEach(path => {
        const parent = path.parent.value;
        
        const hasJSDoc = parent.leadingComments?.some((comment: any) => 
          comment.type === 'CommentBlock' && 
          comment.value.includes('@type')
        );
        
        if (!hasJSDoc) {
          const jsDocComment = this.j.commentBlock(`*
 * @type {Route.MetaFunction}
 */`);
          
          if (!parent.leadingComments) {
            parent.leadingComments = [];
          }
          parent.leadingComments.push(jsDocComment);
          hasChanges = true;
        }
      });
    
    return hasChanges;
  }
  
  addErrorTypeAnnotation(root: Collection): boolean {
    let hasChanges = false;
    
    root.find(this.j.CatchClause).forEach(path => {
      const catchBlock = path.parent.value;
      
      // Check if JSDoc already exists
      const hasJSDoc = catchBlock.handler?.leadingComments?.some((comment: any) => 
        comment.type === 'CommentBlock' && 
        comment.value.includes('@param {Error}')
      );
      
      if (!hasJSDoc && path.value.param) {
        const jsDocComment = this.j.commentLine(` @param {Error} ${path.value.param.name}`);
        
        // Add comment before the catch block
        if (!catchBlock.handler.leadingComments) {
          catchBlock.handler.leadingComments = [];
        }
        catchBlock.handler.leadingComments.push(jsDocComment);
        hasChanges = true;
      }
    });
    
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
    
    const typedefComment = this.j.commentBlock(`*
 * @typedef {Object} AdditionalContext
${propDefs}
 */`);
    
    // Add near the top of the file
    const program = root.find(this.j.Program).get();
    if (!program.value.comments) {
      program.value.comments = [];
    }
    program.value.comments.push(typedefComment);
  }
}