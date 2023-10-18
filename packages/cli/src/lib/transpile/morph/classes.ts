import {Node} from 'ts-morph';
import type {ClassDeclaration, ClassMemberTypes} from 'ts-morph';
import {generateFunctionDocumentation} from './functions.js';
import {getJsDocOrCreate} from './utils.js';

/** Generate documentation for a class — itself and its members */
export function generateClassDocumentation(classNode: ClassDeclaration): void {
  generateClassBaseDocumentation(classNode);
  classNode.getMembers().forEach(generateClassMemberDocumentation);
}

function generateClassMemberDocumentation(classMember: ClassMemberTypes): void {
  generateModifierDocumentation(classMember);

  if (
    Node.isPropertyDeclaration(classMember) ||
    Node.isPropertyAssignment(classMember) ||
    Node.isPropertySignature(classMember)
  ) {
    generateClassPropertyDocumentation(classMember);
  }

  if (
    Node.isMethodDeclaration(classMember) ||
    Node.isConstructorDeclaration(classMember)
  ) {
    generateFunctionDocumentation(classMember);
  }
}

function generateClassBaseDocumentation(classNode: ClassDeclaration) {
  const jsDoc = getJsDocOrCreate(classNode);
  const extendedClass = classNode.getExtends();
  if (extendedClass) {
    jsDoc.addTag({tagName: 'extends', text: extendedClass.getText()});
  }
}

/**
 * Add default value to class property documentation
 */
function generateClassPropertyDocumentation(
  classMember: ClassMemberTypes,
): void {
  const structure = classMember.getStructure();
  if (structure && 'initializer' in structure) {
    const initializer = structure.initializer;
    if (initializer && initializer !== 'undefined') {
      const jsDoc = getJsDocOrCreate(classMember);
      jsDoc.addTag({tagName: 'default', text: initializer});
    }
  }
}

/** Generate modifier documentation for class member */
function generateModifierDocumentation(classMember: ClassMemberTypes): void {
  if ('getModifiers' in classMember) {
    const modifiers = classMember.getModifiers() || [];
    for (const modifier of modifiers) {
      const text = modifier?.getText();
      if (
        ['public', 'private', 'protected', 'readonly', 'static'].includes(text)
      ) {
        const jsDoc = getJsDocOrCreate(classMember);
        jsDoc.addTag({tagName: text});
      }
    }
  }
}
