import jscodeshift from 'jscodeshift';

export const transform = (source: string): string => {
  const j = jscodeshift.withParser('tsx');
  const root = j(source);

  root.find(j.CallExpression, {
    callee: {
      object: { name: 'React' },
      property: { name: 'createElement' },
    },
  }).replaceWith((path) => {
    const { arguments: args } = path.node;
    if (args.length < 1) return path.node;

    const [typeArg, propsArg, ...childrenArgs] = args;

    // 1. Tag Name
    let tagName: any = 'div';
    if (typeArg.type === 'StringLiteral') {
      tagName = j.jsxIdentifier(typeArg.value);
    } else if (typeArg.type === 'Identifier') {
      tagName = j.jsxIdentifier(typeArg.name);
    } else {
        return path.node;
    }

    // 2. Attributes
    const attributes: any[] = [];
    if (propsArg && propsArg.type === 'ObjectExpression') {
      propsArg.properties.forEach((prop) => {
        if (prop.type === 'Property' && prop.key.type === 'Identifier') {
            let value: any = prop.value;
            if (value.type === 'StringLiteral') {
                value = j.stringLiteral(value.value); 
            } else {
                value = j.jsxExpressionContainer(value as any);
            }
            attributes.push(j.jsxAttribute(j.jsxIdentifier(prop.key.name), value));
        }
      });
    }

    // 3. Children
    const children: any[] = [];
    childrenArgs.forEach(child => {
        if (child.type === 'StringLiteral') {
            children.push(j.jsxText(child.value));
        } else if (child.type === 'SpreadElement') {
            // Handle ...children spread in arguments -> {children} in JSX
            children.push(j.jsxExpressionContainer(child.argument as any));
        } else {
            children.push(j.jsxExpressionContainer(child as any));
        }
    });

    const openingElement = j.jsxOpeningElement(tagName, attributes, children.length === 0);
    const closingElement = children.length > 0 ? j.jsxClosingElement(tagName) : null;

    return j.jsxElement(openingElement, closingElement, children);
  });

  return root.toSource();
};
