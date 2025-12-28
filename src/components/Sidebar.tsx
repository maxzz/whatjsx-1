import { useSnapshot } from 'valtio';
import { fileStore } from '../store/file-store';
import { clsx } from 'clsx';
import { FileCode, FolderOpen, Star, Loader2 } from 'lucide-react';
import { fileOpen, directoryOpen } from 'browser-fs-access';
import { SettingsMenu } from './SettingsMenu';

export function Sidebar() {
    const snap = useSnapshot(fileStore);

    async function handleOpenFile() {
        try {
            const files = await fileOpen({
                mimeTypes: ['text/javascript', 'application/javascript'],
                extensions: ['.js', '.mjs', '.jsx'],
                multiple: true,
                description: 'JavaScript Files',
            });

            for (const file of files) {
                await fileStore.addFile(file);
            }

            // Process batch after all files are added
            await fileStore.processBatch();
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error(err);
            }
        }
    }

    async function handleOpenFolder() {
        try {
            const files = await directoryOpen({ recursive: true, });

            for (const file of files) {
                if (file.name.endsWith('.js') || file.name.endsWith('.mjs') || file.name.endsWith('.jsx')) {
                    await fileStore.addFile(file as File, (file as any).webkitRelativePath);
                }
            }

            // Process batch after all files are added
            await fileStore.processBatch();
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error(err);
            }
        }
    }

    return (
        <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">
                        Explorer
                    </h2>
                    <SettingsMenu />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleOpenFile}
                        disabled={snap.isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded text-sm transition-colors"
                        title="Open Files"
                    >
                        <FileCode size={16} />
                        Files
                    </button>
                    <button
                        onClick={handleOpenFolder}
                        disabled={snap.isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700/50 text-white rounded text-sm transition-colors"
                        title="Open Folder"
                    >
                        <FolderOpen size={16} />
                        Folder
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {snap.isProcessing ? (
                    <div className="text-gray-400 text-center mt-10 text-sm flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin" size={24} />
                        Processing files...
                    </div>
                ) : snap.files.length === 0 ? (
                    <div className="text-gray-500 text-center mt-10 text-sm">
                        No files loaded.<br />
                        Drag & drop or open files.
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="flex justify-between items-center px-2 py-1 text-xs text-gray-400 uppercase font-bold">
                            <span>Files ({snap.files.length})</span>
                            <button onClick={() => fileStore.clearFiles()} className="hover:text-white">Clear</button>
                        </div>

                        {snap.files.map(
                            (file) => (
                                <button
                                    key={file.id}
                                    onClick={() => fileStore.selectFile(file.id)}
                                    className={clsx(
                                        'w-full text-left px-3 py-2 rounded text-sm truncate transition-colors flex items-center gap-2',
                                        snap.selectedFileId === file.id
                                            ? 'bg-blue-600/20 text-blue-400 border border-blue-600/50'
                                            : 'text-gray-300 hover:bg-gray-800'
                                    )}
                                    title={file.path}
                                >
                                    {file.isRoot ? (
                                        <Star size={14} className="text-yellow-400 flex-shrink-0" />
                                    ) : (
                                        <FileCode size={14} className={clsx("flex-shrink-0", file.error ? "text-red-400" : "text-blue-400")} />
                                    )}
                                    <span className="truncate">{file.name}</span>
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
