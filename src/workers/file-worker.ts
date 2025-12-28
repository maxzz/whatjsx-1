import jscodeshift from 'jscodeshift';
import * as prettier from 'prettier';
import parserBabel from 'prettier/plugins/babel';
import prettierPluginEstree from 'prettier/plugins/estree';

// Types for worker messages
export interface WorkerFileData {
    id: string;
    name: string;
    path: string;
    content: string;
}

export interface WorkerMessage {
    type: 'addFiles' | 'clear' | 'transform';
    files?: WorkerFileData[];
}

export interface WorkerResult {
    type: 'ready' | 'filesReady' | 'transformComplete' | 'error';
    files?: TransformedFile[];
    rootFileId?: string | null;
    error?: string;
}

export interface TransformedFile {
    id: string;
    name: string;
    path: string;
    content: string;        // Pretty-printed original content
    converted: string;      // Pretty-printed transformed JSX
    error?: string;
    isRoot: boolean;
}

// Internal storage for loaded files (with pretty-printed content)
const loadedFiles: Map<string, WorkerFileData> = new Map();

// Prettier options for JavaScript/JSX formatting
const prettierOptions: prettier.Options = {
    parser: 'babel',
    plugins: [parserBabel, prettierPluginEstree],
    printWidth: 100,
    tabWidth: 2,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    jsxSingleQuote: false,
};

// Pretty print / unminify code using Prettier
async function prettify(source: string): Promise<string> {
    try {
        return await prettier.format(source, prettierOptions);
    } catch (e) {
        console.warn('[Worker] Prettier failed, returning original:', e);
        return source;
    }
}

// Transform function (same logic as before)
function transform(source: string): string {
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
}

// Check if file contains 'createElement' - candidate for root file
function hasCreateElement(content: string): boolean {
    return content.includes('createElement');
}

// Find the root file (the one with createElement)
function findRootFileId(): string | null {
    for (const [id, file] of loadedFiles) {
        if (hasCreateElement(file.content)) {
            return id;
        }
    }
    return null;
}

// Transform all loaded files
async function transformAllFiles(): Promise<TransformedFile[]> {
    const rootFileId = findRootFileId();
    const results: TransformedFile[] = [];

    for (const [id, file] of loadedFiles) {
        let converted = '';
        let error: string | undefined;

        try {
            const rawConverted = transform(file.content);
            // Pretty print the converted JSX output too
            converted = await prettify(rawConverted);
        } catch (e: any) {
            error = e.message;
            console.error(`[Worker] Failed to transform ${file.name}:`, e);
        }

        results.push({
            id,
            name: file.name,
            path: file.path,
            content: file.content,
            converted,
            error,
            isRoot: id === rootFileId,
        });
    }

    return results;
}

// Pretty print files when adding them
async function addFiles(files: WorkerFileData[]): Promise<void> {
    for (const file of files) {
        // Pretty print the content before storing
        const prettyContent = await prettify(file.content);
        loadedFiles.set(file.id, {
            ...file,
            content: prettyContent,
        });
        console.log(`[Worker] Added and prettified: ${file.name}`);
    }
}

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, files } = event.data;

    switch (type) {
        case 'addFiles': {
            if (files) {
                await addFiles(files);
            }
            
            const response: WorkerResult = {
                type: 'filesReady',
            };
            self.postMessage(response);
            break;
        }

        case 'transform': {
            try {
                const transformedFiles = await transformAllFiles();
                const rootFileId = transformedFiles.find(f => f.isRoot)?.id ?? null;

                const response: WorkerResult = {
                    type: 'transformComplete',
                    files: transformedFiles,
                    rootFileId,
                };
                self.postMessage(response);
            } catch (e: any) {
                const response: WorkerResult = {
                    type: 'error',
                    error: e.message,
                };
                self.postMessage(response);
            }
            break;
        }

        case 'clear': {
            loadedFiles.clear();
            const response: WorkerResult = {
                type: 'filesReady',
            };
            self.postMessage(response);
            break;
        }
    }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
