import { proxy, snapshot } from 'valtio';
import type { WorkerMessage, WorkerResult, WorkerFileData } from '../workers/file-worker';

export interface FileItem {
    id: string;
    name: string;
    path: string;
    content: string;
    converted: string;
    error?: string;
    isRoot: boolean;
}

interface FileStore {
    files: FileItem[];
    selectedFileId: string | null;
    rootFileId: string | null;
    isProcessing: boolean;
    pendingFiles: WorkerFileData[];
    addFile: (file: File, path?: string) => Promise<void>;
    processBatch: () => Promise<void>;
    selectFile: (id: string) => void;
    clearFiles: () => void;
}

// Create worker instance
const worker = new Worker(
    new URL('../workers/file-worker.ts', import.meta.url),
    { type: 'module' }
);

// Promise resolvers for worker responses
let transformResolve: ((result: WorkerResult) => void) | null = null;
let filesReadyResolve: (() => void) | null = null;

// Handle worker messages
worker.onmessage = (event: MessageEvent<WorkerResult & { type: string }>) => {
    const result = event.data;
    console.log('[FileStore] Worker message:', result.type);

    switch (result.type) {
        case 'ready':
            console.log('[FileStore] Worker ready');
            break;

        case 'filesReady':
            if (filesReadyResolve) {
                filesReadyResolve();
                filesReadyResolve = null;
            }
            break;

        case 'transformComplete':
            if (transformResolve) {
                transformResolve(result);
                transformResolve = null;
            }
            break;

        case 'error':
            console.error('[FileStore] Worker error:', result.error);
            if (transformResolve) {
                transformResolve(result);
                transformResolve = null;
            }
            break;
    }
};

worker.onerror = (error) => {
    console.error('[FileStore] Worker error:', error);
    fileStore.isProcessing = false;
};

export const fileStore = proxy<FileStore>({
    files: [],
    selectedFileId: null,
    rootFileId: null,
    isProcessing: false,
    pendingFiles: [],

    addFile: async (file: File, path?: string) => {
        try {
            const text = await file.text();
            const id = crypto.randomUUID();

            const fileData: WorkerFileData = {
                id,
                name: file.name,
                path: path || file.name,
                content: text,
            };

            fileStore.pendingFiles.push(fileData);
            console.log('[FileStore] Added file to pending:', file.name, 'Total pending:', fileStore.pendingFiles.length);
        } catch (err) {
            console.error('Error reading file:', err);
        }
    },

    processBatch: async () => {
        console.log('[FileStore] processBatch called, pending:', fileStore.pendingFiles.length, 'isProcessing:', fileStore.isProcessing);
        if (fileStore.pendingFiles.length === 0) return;
        if (fileStore.isProcessing) return;

        fileStore.isProcessing = true;

        try {
            // Get plain objects from proxy (required for postMessage serialization)
            const filesToProcess = snapshot(fileStore.pendingFiles) as WorkerFileData[];
            fileStore.pendingFiles = [];

            console.log('[FileStore] Sending', filesToProcess.length, 'files to worker');

            const addMessage: WorkerMessage = {
                type: 'addFiles',
                files: filesToProcess,
            };

            // Wait for files to be added
            await new Promise<void>((resolve) => {
                filesReadyResolve = resolve;
                worker.postMessage(addMessage);
            });

            console.log('[FileStore] Files added, requesting transform');

            // Request transformation
            const transformMessage: WorkerMessage = { type: 'transform' };

            const result = await new Promise<WorkerResult>((resolve) => {
                transformResolve = resolve;
                worker.postMessage(transformMessage);
            });

            if (result.type === 'transformComplete' && result.files) {
                // Update store with transformed files
                for (const transformedFile of result.files) {
                    const fileItem: FileItem = {
                        id: transformedFile.id,
                        name: transformedFile.name,
                        path: transformedFile.path,
                        content: transformedFile.content,
                        converted: transformedFile.converted,
                        error: transformedFile.error,
                        isRoot: transformedFile.isRoot,
                    };

                    fileStore.files.push(fileItem);
                }

                // Set root file
                if (result.rootFileId) {
                    fileStore.rootFileId = result.rootFileId;
                }

                // Select the first file or root file if none selected
                if (!fileStore.selectedFileId && fileStore.files.length > 0) {
                    fileStore.selectedFileId = result.rootFileId || fileStore.files[0].id;
                }
            }
        } catch (err) {
            console.error('Error processing batch:', err);
        } finally {
            fileStore.isProcessing = false;
        }
    },

    selectFile: (id: string) => {
        fileStore.selectedFileId = id;
    },

    clearFiles: () => {
        fileStore.files = [];
        fileStore.selectedFileId = null;
        fileStore.rootFileId = null;
        fileStore.pendingFiles = [];

        // Clear worker storage
        const clearMessage: WorkerMessage = { type: 'clear' };
        worker.postMessage(clearMessage);
    },
});
