import * as ts from 'typescript';

/**
 * Detects the specific function construction that throws an error about `require`
 * and renames it to `__require`.
 * 
 * Also renames the variable that holds this function to `__require` and updates exports.
 * 
 * Target pattern:
 * var r = ((e) => ...)(function(e) { 
 *    throw Error('Calling `require` for "' + e + '" ...) 
 * });
 * export { n, r, t };
 */
export function preprocess(code: string): string {
    const sourceFile = ts.createSourceFile('file.js', code, ts.ScriptTarget.Latest, true);
    let targetVarName: string | null = null;
    let modified = false;

    // Pass 1: Find the variable name
    const findVarName: ts.Visitor = (node) => {
        if (targetVarName) return node;

        if (ts.isVariableDeclaration(node) && node.initializer) {
            // Check if initializer is CallExpression (the IIFE)
            if (ts.isCallExpression(node.initializer)) {
                // Check arguments of the IIFE call
                if (node.initializer.arguments.length > 0) {
                    const arg = node.initializer.arguments[0];
                    if (ts.isFunctionExpression(arg) && containsTargetThrow(arg, sourceFile)) {
                        if (ts.isIdentifier(node.name)) {
                            targetVarName = node.name.text;
                        }
                    }
                }
            }
        }
        return ts.visitEachChild(node, findVarName, undefined);
    };
    ts.visitNode(sourceFile, findVarName);

    if (!targetVarName) {
        return code;
    }

    // Pass 2: Rename Variable and Export
    const transformer = (context: ts.TransformationContext) => {
        const visit: ts.Visitor = (node) => {
            // 1. Rename the Variable Declaration
            if (ts.isVariableDeclaration(node) && 
                ts.isIdentifier(node.name) && 
                node.name.text === targetVarName) {
                
                // Verify it's the right one by checking initializer again? 
                // Or just assume top-level uniqueness if we found it?
                // To be safe, let's check structure again roughly or assume since we just scanned it.
                // We'll rename it.
                modified = true;
                return ts.factory.updateVariableDeclaration(
                    node,
                    ts.factory.createIdentifier("__require"),
                    node.exclamationToken,
                    node.type,
                    ts.visitNode(node.initializer, visit) as ts.Expression // Visit initializer to rename inner function too
                );
            }

            // 2. Rename the inner function (optional but requested in previous step, good for clarity)
            if (ts.isFunctionExpression(node)) {
                if (containsTargetThrow(node, sourceFile)) {
                    modified = true;
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

            // 3. Update Exports
            if (ts.isExportSpecifier(node)) {
                if (node.name.text === targetVarName && !node.propertyName) {
                    modified = true;
                    // export { r } -> export { __require }
                    return ts.factory.updateExportSpecifier(
                        node,
                        node.isTypeOnly,
                        undefined,
                        ts.factory.createIdentifier("__require")
                    );
                }
                if (node.propertyName && node.propertyName.text === targetVarName) {
                     // export { r as something } -> export { __require as something }
                     modified = true;
                     return ts.factory.updateExportSpecifier(
                        node,
                        node.isTypeOnly,
                        ts.factory.createIdentifier("__require"),
                        node.name
                    );
                }
            }
            
            return ts.visitEachChild(node, visit, context);
        };
        return (node: ts.Node) => ts.visitNode(node, visit) as ts.Node;
    };

    const result = ts.transform(sourceFile, [transformer]);
    
    if (!modified) {
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
