import jscodeshift from 'jscodeshift';
import * as prettier from 'prettier';
import parserBabel from 'prettier/plugins/babel';
import prettierPluginEstree from 'prettier/plugins/estree';

// Prettier settings that can be configured
export interface PrettierSettings {
    printWidth: number;
    tabWidth: number;
    useTabs: boolean;
    semi: boolean;
    singleQuote: boolean;
    trailingComma: 'none' | 'es5' | 'all';
    bracketSpacing: boolean;
    jsxSingleQuote: boolean;
}

// Types for worker messages
export interface WorkerFileData {
    id: string;
    name: string;
    path: string;
    content: string;
}

export interface WorkerMessage {
    type: 'addFiles' | 'clear' | 'transform' | 'updateSettings';
    files?: WorkerFileData[];
    prettierSettings?: PrettierSettings;
}

export interface WorkerResult {
    type: 'ready' | 'filesReady' | 'transformComplete' | 'error' | 'settingsUpdated';
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

// Default prettier settings
let currentPrettierSettings: PrettierSettings = {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    jsxSingleQuote: false,
};

// Build prettier options from settings
function buildPrettierOptions(): prettier.Options {
    return {
        parser: 'babel',
        plugins: [parserBabel, prettierPluginEstree],
        printWidth: currentPrettierSettings.printWidth,
        tabWidth: currentPrettierSettings.tabWidth,
        useTabs: currentPrettierSettings.useTabs,
        semi: currentPrettierSettings.semi,
        singleQuote: currentPrettierSettings.singleQuote,
        trailingComma: currentPrettierSettings.trailingComma,
        bracketSpacing: currentPrettierSettings.bracketSpacing,
        jsxSingleQuote: currentPrettierSettings.jsxSingleQuote,
    };
}

// Pretty print / unminify code using Prettier
async function prettify(source: string): Promise<string> {
    try {
        return await prettier.format(source, buildPrettierOptions());
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
    const { type, files, prettierSettings } = event.data;

    switch (type) {
        case 'updateSettings': {
            if (prettierSettings) {
                currentPrettierSettings = prettierSettings;
                console.log('[Worker] Settings updated:', prettierSettings);
            }
            const response: WorkerResult = {
                type: 'settingsUpdated',
            };
            self.postMessage(response);
            break;
        }

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
