import * as ts from 'typescript';
import fs from 'fs';
import path from 'path';

// Copied from src/core/preprocess.ts (simplified for testing logic)
function preprocess(code: string): string {
    const sourceFile = ts.createSourceFile('file.js', code, ts.ScriptTarget.Latest, true);
    let targetRequireVarName: string | null = null;
    let targetExportVarName: string | null = null;
    let modified = false;

    // Pass 1: Find variable names
    const findVarNames: ts.Visitor = (node) => {
        if (targetRequireVarName && targetExportVarName) return node;

        if (ts.isVariableDeclaration(node) && node.initializer) {
            // Check for __require pattern (IIFE)
            if (!targetRequireVarName && ts.isCallExpression(node.initializer)) {
                if (node.initializer.arguments.length > 0) {
                    const arg = node.initializer.arguments[0];
                    if (ts.isFunctionExpression(arg) && containsTargetThrow(arg, sourceFile)) {
                        if (ts.isIdentifier(node.name)) {
                            targetRequireVarName = node.name.text;
                             console.log("Found require var:", targetRequireVarName);
                        }
                    }
                }
            }
            
            // Check for __exportAll pattern (Arrow Function)
            if (!targetExportVarName && ts.isArrowFunction(node.initializer)) {
                if (containsModuleTag(node.initializer, sourceFile)) {
                    if (ts.isIdentifier(node.name)) {
                        targetExportVarName = node.name.text;
                        console.log("Found export var:", targetExportVarName);
                    }
                }
            }
        }
        return ts.visitEachChild(node, findVarNames, undefined);
    };
    ts.visitNode(sourceFile, findVarNames);

    if (!targetRequireVarName && !targetExportVarName) {
        return code;
    }

    // Pass 2: Rename Variables and Exports
    const transformer = (context: ts.TransformationContext) => {
        const visit: ts.Visitor = (node) => {
            // 1. Rename Variable Declarations
            // NOTE: The previous script failed here because `ts.isIdentifier(node.name)` might be returning false?
            // Or node structure is different. Let's log what we visit.
            if (ts.isVariableDeclaration(node)) {
                if (ts.isIdentifier(node.name)) {
                    // console.log("Visiting variable declaration:", node.name.text);
                    if (node.name.text === targetRequireVarName) {
                        modified = true;
                        return ts.factory.updateVariableDeclaration(
                            node,
                            ts.factory.createIdentifier("__require"),
                            node.exclamationToken,
                            node.type,
                            ts.visitNode(node.initializer, visit) as ts.Expression
                        );
                    }
                    if (node.name.text === targetExportVarName) {
                        modified = true;
                        return ts.factory.updateVariableDeclaration(
                            node,
                            ts.factory.createIdentifier("__exportAll"),
                            node.exclamationToken,
                            node.type,
                            ts.visitNode(node.initializer, visit) as ts.Expression
                        );
                    }
                }
            }

            // 2. Rename the inner function for __require
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
                if (node.name.text === targetRequireVarName && !node.propertyName) {
                    modified = true;
                    return ts.factory.updateExportSpecifier(
                        node,
                        node.isTypeOnly,
                        undefined,
                        ts.factory.createIdentifier("__require")
                    );
                }
                if (node.name.text === targetExportVarName && !node.propertyName) {
                    modified = true;
                    return ts.factory.updateExportSpecifier(
                        node,
                        node.isTypeOnly,
                        undefined,
                        ts.factory.createIdentifier("__exportAll")
                    );
                }
                 if (node.propertyName) {
                    if (node.propertyName.text === targetRequireVarName) {
                        modified = true;
                        return ts.factory.updateExportSpecifier(
                           node,
                           node.isTypeOnly,
                           ts.factory.createIdentifier("__require"),
                           node.name
                       );
                    }
                    if (node.propertyName.text === targetExportVarName) {
                        modified = true;
                        return ts.factory.updateExportSpecifier(
                           node,
                           node.isTypeOnly,
                           ts.factory.createIdentifier("__exportAll"),
                           node.name
                       );
                    }
                 }
            }
            
            return ts.visitEachChild(node, visit, context);
        };
        return (node: ts.Node) => ts.visitNode(node, visit) as ts.Node;
    };

    const result = ts.transform(sourceFile, [transformer]);
    
    // Force print to see what's happening even if modified flag logic is weird (though it should be true)
    const printer = ts.createPrinter();
    return printer.printFile(result.transformed[0] as ts.SourceFile);
}

// Helper: Check for "throw Error(...)" pattern
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

// Helper: Check for "Symbol.toStringTag, { value: `Module` }" pattern
function containsModuleTag(arrowFunc: ts.ArrowFunction, sourceFile: ts.SourceFile): boolean {
    let found = false;
    
    function visit(node: ts.Node) {
        if (found) return;

        if (ts.isCallExpression(node)) {
            const args = node.arguments;
            if (args.length >= 3) {
                const secondArg = args[1];
                if (ts.isPropertyAccessExpression(secondArg) &&
                    ts.isIdentifier(secondArg.expression) && secondArg.expression.text === 'Symbol' &&
                    secondArg.name.text === 'toStringTag') {
                    
                    const thirdArg = args[2];
                    if (ts.isObjectLiteralExpression(thirdArg)) {
                        const hasModuleValue = thirdArg.properties.some(prop => {
                            if (ts.isPropertyAssignment(prop) && 
                                ts.isIdentifier(prop.name) && prop.name.text === 'value') {
                                if (ts.isNoSubstitutionTemplateLiteral(prop.initializer) || ts.isStringLiteral(prop.initializer)) {
                                    return prop.initializer.text === 'Module';
                                }
                            }
                            return false;
                        });

                        if (hasModuleValue) {
                            found = true;
                        }
                    }
                }
            }
        }
        ts.forEachChild(node, visit);
    }

    visit(arrowFunc.body);
    return found;
}

const testFilePath = path.join(process.cwd(), 'src/assets/tests/rolldown-runtime.B2GvktQb.mjs');
if (fs.existsSync(testFilePath)) {
    console.log(`Reading ${testFilePath}`);
    const content = fs.readFileSync(testFilePath, 'utf8');
    const result = preprocess(content);
    
    if (result.includes('__exportAll =')) {
        console.log("SUCCESS: Found variable declaration '__exportAll'");
    } else {
        console.log("FAILURE: Variable declaration '__exportAll' not found");
        console.log("Excerpt around exportAll detection:");
        const lines = result.split('\n');
        // Find line with Module
        lines.forEach(line => {
             if (line.includes('Module')) console.log(line);
        });
    }

    if (result.includes('export {') && result.includes('__exportAll')) {
        console.log("SUCCESS: Found export containing '__exportAll'");
    } else {
        console.log("FAILURE: Export for '__exportAll' not updated");
    }
} else {
    console.error(`File not found: ${testFilePath}`);
}
