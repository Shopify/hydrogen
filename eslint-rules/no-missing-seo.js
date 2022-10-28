module.exports = {
  meta: {
    type: 'best-practices',
    docs: {
      description: 'Use hydrogen/remix-seo to validate SEO on your pages',
    },
    schema: [],
  },
  create(context) {
    return {
      ExportNamedDeclaration(node) {
        if (
          !context.getFilename().includes('routes') ||
          node.declaration?.type !== 'VariableDeclaration'
        ) {
          return;
        }

        const {declarations} = node.declaration;
        const hasHandleExport = declarations.some(
          (declaration) => declaration.id.name === 'handle',
        );

        if (!hasHandleExport) {
          return;
        }

        declarations.forEach((declaration) => {
          if (declaration.id.name !== 'handle') {
            return;
          }

          const hasSeoKey = declaration.init.properties.includes(
            (property) => property.key.name === 'seo',
          );

          if (hasSeoKey) {
            return;
          }

          context.report(
            node,
            'Ensure that all routes define an seo field on the handle export',
          );
        });
      },
    };
  },
};
