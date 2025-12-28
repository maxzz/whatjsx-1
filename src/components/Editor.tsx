import { useSnapshot } from 'valtio';
import { fileStore } from '../store/file-store';
import { settingsStore } from '../store/settings-store';
import { useState, useMemo, memo, useDeferredValue } from 'react';
import { clsx } from 'clsx';
import { Highlight, themes, type PrismTheme } from 'prism-react-renderer';

// Get theme based on app theme setting
function getHighlightTheme(theme: 'dark' | 'light'): PrismTheme {
    return theme === 'dark' ? themes.nightOwl : themes.github;
}

interface CodeBlockProps {
    code: string;
    language: string;
    theme: PrismTheme;
    isDark: boolean;
    highlightLineLimit: number;
}

// Plain text fallback component
const PlainCodeBlock = memo(function PlainCodeBlock({ code, isDark }: { code: string; isDark: boolean }) {
    const lines = code.split('\n');
    return (
        <pre className={clsx("font-mono text-sm", isDark ? 'text-gray-300' : 'text-gray-700')}>
            {lines.map((line, i) => (
                <div key={i} className="leading-relaxed">
                    <span className="inline-block w-12 text-right pr-4 select-none opacity-40">
                        {i + 1}
                    </span>
                    <span>{line || ' '}</span>
                </div>
            ))}
        </pre>
    );
});

// Highlighted code block props (subset of CodeBlockProps)
interface HighlightedCodeBlockProps {
    code: string;
    language: string;
    theme: PrismTheme;
}

// Highlighted code block with error fallback
const HighlightedCodeBlock = memo(function HighlightedCodeBlock({ code, language, theme }: HighlightedCodeBlockProps) {
    return (
        <Highlight theme={theme} code={code} language={language}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                    className={clsx(className, 'font-mono text-sm')}
                    style={{ ...style, background: 'transparent', margin: 0, padding: 0 }}
                >
                    {tokens.map((line, i) => (
                        <div key={i} {...getLineProps({ line })} className="leading-relaxed">
                            <span className="inline-block w-12 text-right pr-4 select-none opacity-40">
                                {i + 1}
                            </span>
                            {line.map((token, key) => (
                                <span key={key} {...getTokenProps({ token })} />
                            ))}
                        </div>
                    ))}
                </pre>
            )}
        </Highlight>
    );
});

// Main code block component with smart fallback
const CodeBlock = memo(function CodeBlock({ code, language, theme, isDark, highlightLineLimit }: CodeBlockProps) {
    const lines = code.split('\n');
    
    // For large files, skip highlighting entirely based on user setting
    if (lines.length > highlightLineLimit) {
        return <PlainCodeBlock code={code} isDark={isDark} />;
    }

    // Try to render with highlighting, fall back to plain on error
    try {
        return <HighlightedCodeBlock code={code} language={language} theme={theme} />;
    } catch (error) {
        console.warn('[Editor] Highlight failed, using plain text:', error);
        return <PlainCodeBlock code={code} isDark={isDark} />;
    }
});

// Error boundary for catching render errors in highlighting
import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
    fallback: ReactNode;
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class HighlightErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn('[Editor] Highlight render error:', error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

// Wrapper that uses error boundary for safety
const SafeCodeBlock = memo(function SafeCodeBlock({ code, language, theme, isDark, highlightLineLimit }: CodeBlockProps) {
    const plainFallback = <PlainCodeBlock code={code} isDark={isDark} />;
    
    return (
        <HighlightErrorBoundary fallback={plainFallback}>
            <CodeBlock code={code} language={language} theme={theme} isDark={isDark} highlightLineLimit={highlightLineLimit} />
        </HighlightErrorBoundary>
    );
});

export function Editor() {
    const snap = useSnapshot(fileStore);
    const settings = useSnapshot(settingsStore);
    const file = snap.files.find(f => f.id === snap.selectedFileId);
    const [activeTab, setActiveTab] = useState<'original' | 'converted'>('converted');

    // Defer the code content to make UI feel more responsive
    const deferredFileId = useDeferredValue(snap.selectedFileId);
    const deferredFile = snap.files.find(f => f.id === deferredFileId);
    const isStale = deferredFileId !== snap.selectedFileId;

    const isDark = settings.theme === 'dark';

    // Get the appropriate theme
    const highlightTheme = useMemo(
        () => getHighlightTheme(settings.theme),
        [settings.theme]
    );

    // Get code to display
    const code = useMemo(() => {
        if (!deferredFile) return '';
        return activeTab === 'original' ? deferredFile.content : deferredFile.converted;
    }, [deferredFile, activeTab]);

    const language = activeTab === 'converted' ? 'jsx' : 'javascript';

    if (!file) {
        return (
            <div className={clsx(
                "flex-1 flex items-center justify-center",
                isDark ? 'bg-gray-950 text-gray-500' : 'bg-gray-50 text-gray-400'
            )}>
                Select a file to view
            </div>
        );
    }

    return (
        <div className={clsx(
            "flex-1 flex flex-col h-full overflow-hidden",
            isDark ? 'bg-gray-950' : 'bg-white'
        )}>
            <div className={clsx(
                "flex border-b",
                isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-100'
            )}>
                <button
                    onClick={() => setActiveTab('original')}
                    className={clsx(
                        'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                        activeTab === 'original'
                            ? isDark
                                ? 'border-blue-500 text-white bg-gray-800'
                                : 'border-blue-500 text-gray-900 bg-white'
                            : isDark
                                ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                >
                    Original Source
                </button>

                <button
                    onClick={() => setActiveTab('converted')}
                    className={clsx(
                        'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                        activeTab === 'converted'
                            ? isDark
                                ? 'border-blue-500 text-white bg-gray-800'
                                : 'border-blue-500 text-gray-900 bg-white'
                            : isDark
                                ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                >
                    Converted JSX
                </button>

                <div className={clsx(
                    "flex-1 flex items-center justify-end px-4 text-xs",
                    isDark ? 'text-gray-500' : 'text-gray-400'
                )}>
                    {file.path}
                    {isStale && <span className="ml-2 text-blue-400">Loading...</span>}
                </div>
            </div>

            <div className={clsx(
                "flex-1 overflow-auto p-4",
                isStale && "opacity-60 transition-opacity"
            )}>
                {file.error ? (
                    <div className={clsx(
                        "p-4 rounded",
                        isDark
                            ? 'bg-red-900/20 border border-red-900/50 text-red-200'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    )}>
                        <h3 className="font-bold mb-2">Transformation Error</h3>
                        <pre className="whitespace-pre-wrap font-mono text-sm">{file.error}</pre>
                    </div>
                ) : code ? (
                    <SafeCodeBlock
                        code={code}
                        language={language}
                        theme={highlightTheme}
                        isDark={isDark}
                        highlightLineLimit={settings.editor.highlightLineLimit}
                    />
                ) : null}
            </div>
        </div>
    );
}
