import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';

// Copied from src/core/preprocess.ts
function preprocess(code: string): string {
    const sourceFile = ts.createSourceFile('file.js', code, ts.ScriptTarget.Latest, true);
    let targetVarName: string | null = null;
    let modified = false;

    // Pass 1: Find the variable name
    const findVarName: ts.Visitor = (node) => {
        if (targetVarName) return node;

        if (ts.isVariableDeclaration(node) && node.initializer) {
            if (ts.isCallExpression(node.initializer)) {
                if (node.initializer.arguments.length > 0) {
                    const arg = node.initializer.arguments[0];
                    if (ts.isFunctionExpression(arg) && containsTargetThrow(arg, sourceFile)) {
                        if (ts.isIdentifier(node.name)) {
                            targetVarName = node.name.text;
                            console.log("Found target variable name:", targetVarName);
                        }
                    }
                }
            }
        }
        return ts.visitEachChild(node, findVarName, undefined);
    };
    ts.visitNode(sourceFile, findVarName);

    if (!targetVarName) {
        console.log("Target variable not found.");
        return code;
    }

    // Pass 2: Rename Variable and Export
    const transformer = (context: ts.TransformationContext) => {
        const visit: ts.Visitor = (node) => {
            // 1. Rename the Variable Declaration
            if (ts.isVariableDeclaration(node) && 
                ts.isIdentifier(node.name) && 
                node.name.text === targetVarName) {
                
                modified = true;
                return ts.factory.updateVariableDeclaration(
                    node,
                    ts.factory.createIdentifier("__require"),
                    node.exclamationToken,
                    node.type,
                    ts.visitNode(node.initializer, visit) as ts.Expression 
                );
            }

            // 2. Rename the inner function
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
                    return ts.factory.updateExportSpecifier(
                        node,
                        node.isTypeOnly,
                        undefined,
                        ts.factory.createIdentifier("__require")
                    );
                }
                if (node.propertyName && node.propertyName.text === targetVarName) {
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

function containsTargetThrow(funcNode: ts.FunctionExpression, sourceFile: ts.SourceFile): boolean {
    let found = false;
    
    function visit(node: ts.Node) {
        if (found) return;
        if (ts.isThrowStatement(node)) {
            const expr = node.expression;
            if ((ts.isCallExpression(expr) || ts.isNewExpression(expr)) && 
                ts.isIdentifier(expr.expression) && 
                expr.expression.text === 'Error') {
                
                if (expr.arguments && expr.arguments.length > 0) {
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

const testFilePath = path.join(process.cwd(), 'src/assets/tests/rolldown-runtime.B2GvktQb.mjs');
if (fs.existsSync(testFilePath)) {
    console.log(`Reading ${testFilePath}`);
    const content = fs.readFileSync(testFilePath, 'utf8');
    const result = preprocess(content);
    
    if (result.includes('var __require =') || result.includes('let __require =') || result.includes('const __require =')) {
        console.log("SUCCESS: Found variable declaration '__require'");
    } else {
        console.log("FAILURE: Variable declaration not renamed");
    }

    if (result.includes('export {') && result.includes('__require')) {
        console.log("SUCCESS: Found export containing '__require'");
    } else {
        console.log("FAILURE: Export not updated");
        // console.log("Result preview:", result.substring(0, 500));
    }
} else {
    console.error(`File not found: ${testFilePath}`);
}

