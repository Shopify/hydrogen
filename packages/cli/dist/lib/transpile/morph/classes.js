import { Node } from 'ts-morph';
import { generateFunctionDocumentation } from './functions.js';
import { getJsDocOrCreate } from './utils.js';

function generateClassDocumentation(classNode) {
  generateClassBaseDocumentation(classNode);
  classNode.getMembers().forEach(generateClassMemberDocumentation);
}
function generateClassMemberDocumentation(classMember) {
  generateModifierDocumentation(classMember);
  if (Node.isPropertyDeclaration(classMember) || Node.isPropertyAssignment(classMember) || Node.isPropertySignature(classMember)) {
    generateClassPropertyDocumentation(classMember);
  }
  if (Node.isMethodDeclaration(classMember) || Node.isConstructorDeclaration(classMember)) {
    generateFunctionDocumentation(classMember);
  }
}
function generateClassBaseDocumentation(classNode) {
  const jsDoc = getJsDocOrCreate(classNode);
  const extendedClass = classNode.getExtends();
  if (extendedClass) {
    jsDoc.addTag({ tagName: "extends", text: extendedClass.getText() });
  }
}
function generateClassPropertyDocumentation(classMember) {
  const structure = classMember.getStructure();
  if (structure && "initializer" in structure) {
    const initializer = structure.initializer;
    if (initializer && initializer !== "undefined") {
      const jsDoc = getJsDocOrCreate(classMember);
      jsDoc.addTag({ tagName: "default", text: initializer });
    }
  }
}
function generateModifierDocumentation(classMember) {
  if ("getModifiers" in classMember) {
    const modifiers = classMember.getModifiers() || [];
    for (const modifier of modifiers) {
      const text = modifier?.getText();
      if (["public", "private", "protected", "readonly", "static"].includes(text)) {
        const jsDoc = getJsDocOrCreate(classMember);
        jsDoc.addTag({ tagName: text });
      }
    }
  }
}

export { generateClassDocumentation };
