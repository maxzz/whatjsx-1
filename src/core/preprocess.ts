import * as ts from 'typescript';

/**
 * Detects the specific function construction that throws an error about `require`
 * and renames it to `__require`.
 * 
 * Target pattern:
 * throw Error('Calling `require` for "' + e + '" in an environment that doesn\'t expose the `require` function.')
 */
export function preprocess(code: string): string {
    // 1. Create a SourceFile from the code
    const sourceFile = ts.createSourceFile('file.js', code, ts.ScriptTarget.Latest, true);
    let modified = false;

    // 2. Define the transformer
    const transformer = (context: ts.TransformationContext) => {
        const visit: ts.Visitor = (node) => {
            // Check if we found a FunctionExpression
            if (ts.isFunctionExpression(node)) {
                // Check if this function contains the target throw statement
                if (containsTargetThrow(node, sourceFile)) {
                    modified = true;
                    // 3. Replace/Update the function with the name "__require"
                    return ts.factory.updateFunctionExpression(
                        node,
                        node.modifiers,
                        node.asteriskToken,
                        ts.factory.createIdentifier("__require"),
                        node.typeParameters,
                        node.parameters,
                        node.type,
                        node.body
                    );
                }
            }
            // Continue visiting children
            return ts.visitEachChild(node, visit, context);
        };
        return (node: ts.Node) => ts.visitNode(node, visit) as ts.Node;
    };

    // 4. Apply transformation and print result
    // We only want to print if modifications happened or return original if the print cost is high,
    // but ts.transform is cheap enough here.
    const result = ts.transform(sourceFile, [transformer]);
    
    // If no changes, return original code to preserve formatting as much as possible before prettier
    if (!modified && result.transformed[0] === sourceFile) {
        return code; 
    }

    const printer = ts.createPrinter();
    return printer.printFile(result.transformed[0] as ts.SourceFile);
}

// Helper to find the specific "throw Error(...)" pattern
function containsTargetThrow(funcNode: ts.FunctionExpression, sourceFile: ts.SourceFile): boolean {
    let found = false;
    
    function visit(node: ts.Node) {
        if (found) return;
        
        if (ts.isThrowStatement(node)) {
            const expr = node.expression;
            // Check for CallExpression: throw Error(...) 
            // or NewExpression: throw new Error(...)
            if ((ts.isCallExpression(expr) || ts.isNewExpression(expr)) && 
                ts.isIdentifier(expr.expression) && 
                expr.expression.text === 'Error') {
                
                // Check the error message argument
                if (expr.arguments && expr.arguments.length > 0) {
                    // Get the text from source to match the pattern
                    const argText = expr.arguments[0].getText(sourceFile);
                    if (argText.includes('Calling `require` for "')) {
                        found = true;
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }
    
    visit(funcNode.body);
    return found;
}

