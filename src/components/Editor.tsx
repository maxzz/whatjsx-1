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

// Memoized code block component with large file fallback
interface VirtualCodeBlockProps {
    code: string;
    language: string;
    theme: PrismTheme;
}

const SimpleCodeBlock = memo(function SimpleCodeBlock({ code, language, theme }: VirtualCodeBlockProps) {
    // For very large files, show without full highlighting
    const lines = code.split('\n');
    const isLargeFile = lines.length > 5000;

    if (isLargeFile) {
        return (
            <pre className="font-mono text-sm text-gray-300 dark:text-gray-300 light:text-gray-700">
                {lines.map((line, i) => (
                    <div key={i} className="leading-relaxed">
                        <span className="inline-block w-12 text-right pr-4 select-none opacity-40">
                            {i + 1}
                        </span>
                        {line}
                    </div>
                ))}
            </pre>
        );
    }

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

export function Editor() {
    const snap = useSnapshot(fileStore);
    const settings = useSnapshot(settingsStore);
    const file = snap.files.find(f => f.id === snap.selectedFileId);
    const [activeTab, setActiveTab] = useState<'original' | 'converted'>('converted');

    // Defer the code content to make UI feel more responsive
    const deferredFileId = useDeferredValue(snap.selectedFileId);
    const deferredFile = snap.files.find(f => f.id === deferredFileId);
    const isStale = deferredFileId !== snap.selectedFileId;

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
                settings.theme === 'dark' ? 'bg-gray-950 text-gray-500' : 'bg-gray-50 text-gray-400'
            )}>
                Select a file to view
            </div>
        );
    }

    return (
        <div className={clsx(
            "flex-1 flex flex-col h-full overflow-hidden",
            settings.theme === 'dark' ? 'bg-gray-950' : 'bg-white'
        )}>
            <div className={clsx(
                "flex border-b",
                settings.theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-100'
            )}>
                <button
                    onClick={() => setActiveTab('original')}
                    className={clsx(
                        'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                        activeTab === 'original'
                            ? settings.theme === 'dark'
                                ? 'border-blue-500 text-white bg-gray-800'
                                : 'border-blue-500 text-gray-900 bg-white'
                            : settings.theme === 'dark'
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
                            ? settings.theme === 'dark'
                                ? 'border-blue-500 text-white bg-gray-800'
                                : 'border-blue-500 text-gray-900 bg-white'
                            : settings.theme === 'dark'
                                ? 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    )}
                >
                    Converted JSX
                </button>

                <div className={clsx(
                    "flex-1 flex items-center justify-end px-4 text-xs",
                    settings.theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
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
                        settings.theme === 'dark'
                            ? 'bg-red-900/20 border border-red-900/50 text-red-200'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    )}>
                        <h3 className="font-bold mb-2">Transformation Error</h3>
                        <pre className="whitespace-pre-wrap font-mono text-sm">{file.error}</pre>
                    </div>
                ) : code ? (
                    <SimpleCodeBlock
                        code={code}
                        language={language}
                        theme={highlightTheme}
                    />
                ) : null}
            </div>
        </div>
    );
}
