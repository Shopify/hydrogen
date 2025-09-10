import type { JSCodeshift, Collection } from 'jscodeshift';

export class TypeScriptStrategy {
  constructor(private j: JSCodeshift) {}
  
  addRouteTypeImport(root: Collection, routeName: string): boolean {
    const importPath = `./+types/${routeName}`;
    
    // Check if import already exists
    const hasImport = root.find(this.j.ImportDeclaration, {
      source: { value: importPath }
    }).length > 0;
    
    if (!hasImport) {
      const routeImport = this.j.importDeclaration(
        [this.j.importSpecifier(this.j.identifier('Route'))],
        this.j.literal(importPath),
        'type'
      );
      
      // Insert after last import
      const imports = root.find(this.j.ImportDeclaration);
      if (imports.length > 0) {
        imports.at(-1).insertAfter(routeImport);
      } else {
        root.get().node.program.body.unshift(routeImport);
      }
      
      return true;
    }
    
    return false;
  }
  
  transformLoaderType(root: Collection): boolean {
    let hasChanges = false;
    
    // Transform LoaderFunctionArgs to Route.LoaderArgs
    root.find(this.j.TSTypeReference, {
      typeName: { name: 'LoaderFunctionArgs' }
    }).forEach(path => {
      this.j(path).replaceWith(
        this.j.tsTypeReference(
          this.j.tsQualifiedName(
            this.j.identifier('Route'),
            this.j.identifier('LoaderArgs')
          )
        )
      );
      hasChanges = true;
    });
    
    return hasChanges;
  }
  
  transformActionType(root: Collection): boolean {
    let hasChanges = false;
    
    // Transform ActionFunctionArgs to Route.ActionArgs
    root.find(this.j.TSTypeReference, {
      typeName: { name: 'ActionFunctionArgs' }
    }).forEach(path => {
      this.j(path).replaceWith(
        this.j.tsTypeReference(
          this.j.tsQualifiedName(
            this.j.identifier('Route'),
            this.j.identifier('ActionArgs')
          )
        )
      );
      hasChanges = true;
    });
    
    return hasChanges;
  }
  
  transformMetaType(root: Collection): boolean {
    let hasChanges = false;
    
    // Transform MetaFunction to Route.MetaFunction
    root.find(this.j.TSTypeReference, {
      typeName: { name: 'MetaFunction' }
    }).forEach(path => {
      // Skip if already qualified with Route
      if (path.parent.value.type === 'TSTypeParameterInstantiation') {
        return;
      }
      
      this.j(path).replaceWith(
        this.j.tsTypeReference(
          this.j.tsQualifiedName(
            this.j.identifier('Route'),
            this.j.identifier('MetaFunction')
          )
        )
      );
      hasChanges = true;
    });
    
    // Also handle variable declarations with MetaFunction type
    root.find(this.j.VariableDeclarator, {
      id: { name: 'meta' }
    }).forEach(path => {
      const typeAnnotation = path.value.id.typeAnnotation;
      if (typeAnnotation?.typeAnnotation?.typeName?.name === 'MetaFunction') {
        path.value.id.typeAnnotation = this.j.tsTypeAnnotation(
          this.j.tsTypeReference(
            this.j.tsQualifiedName(
              this.j.identifier('Route'),
              this.j.identifier('MetaFunction')
            )
          )
        );
        hasChanges = true;
      }
    });
    
    return hasChanges;
  }
  
  addErrorTypeAnnotation(root: Collection): boolean {
    let hasChanges = false;
    
    root.find(this.j.CatchClause).forEach(path => {
      const param = path.value.param;
      if (param && param.type === 'Identifier' && !param.typeAnnotation) {
        param.typeAnnotation = this.j.tsTypeAnnotation(
          this.j.tsTypeReference(this.j.identifier('Error'))
        );
        hasChanges = true;
      }
    });
    
    return hasChanges;
  }
  
  addContextTypeAugmentation(root: Collection, properties: any[]): void {
    const interfaceProperties = properties.map(prop => {
      if (prop.type === 'Property' && prop.key.type === 'Identifier') {
        return this.j.tsPropertySignature(
          this.j.identifier(prop.key.name),
          this.j.tsTypeAnnotation(this.j.tsAnyKeyword())
        );
      }
      return null;
    }).filter(Boolean);
    
    const moduleDeclaration = this.j.exportNamedDeclaration(
      this.j.tsModuleDeclaration(
        this.j.identifier('ReactRouter'),
        this.j.tsModuleBlock([
          this.j.tsInterfaceDeclaration(
            this.j.identifier('AppLoadContext'),
            this.j.tsInterfaceBody(interfaceProperties)
          )
        ])
      )
    );
    
    // Find the best place to insert
    const lastImport = root.find(this.j.ImportDeclaration).at(-1);
    if (lastImport.length > 0) {
      lastImport.insertAfter(moduleDeclaration);
    } else {
      root.get().node.program.body.unshift(moduleDeclaration);
    }
  }
}