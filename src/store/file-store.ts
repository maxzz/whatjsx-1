import { proxy } from 'valtio';
import TransformWorker from '../core/transform.worker?worker';
import type { TransformRequest, TransformResponse } from '../core/transform.worker';

export interface FileItem {
    id: string;
    name: string;
    path: string; // Relative path if from folder, or just name
    content: string;
    converted: string;
    error?: string;
}

interface FileStore {
    files: FileItem[];
    selectedFileId: string | null;
    addFile: (file: File, path?: string) => Promise<void>;
    selectFile: (id: string) => void;
    clearFiles: () => void;
}

// Create worker instance
const worker = new TransformWorker();

// Map to track pending transform requests
const pendingRequests = new Map<string, {
    resolve: (result: string) => void;
    reject: (error: Error) => void;
}>();

// Handle worker responses
worker.onmessage = (e: MessageEvent<TransformResponse>) => {
    const { id, result, error } = e.data;
    const pending = pendingRequests.get(id);
    
    if (pending) {
        pendingRequests.delete(id);
        if (error) {
            pending.reject(new Error(error));
        } else {
            pending.resolve(result ?? '');
        }
    }
};

// Promise-based transform via worker
function transformInWorker(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, source } satisfies TransformRequest);
    });
}

export const fileStore = proxy<FileStore>({
    files: [],
    selectedFileId: null,

    addFile: async (file: File, path?: string) => {
        try {
            const text = await file.text();
            let converted = '';
            let error = undefined;

            try {
                converted = await transformInWorker(text);
            } catch (e: any) {
                error = e.message;
                console.error(`Failed to transform ${file.name}:`, e);
            }

            const id = crypto.randomUUID();
            const fileItem: FileItem = {
                id,
                name: file.name,
                path: path || file.name,
                content: text,
                converted,
                error,
            };

            fileStore.files.push(fileItem);

            // Select the first file added if none selected
            if (!fileStore.selectedFileId) {
                fileStore.selectedFileId = id;
            }
        } catch (err) {
            console.error('Error reading file:', err);
        }
    },

    selectFile: (id: string) => {
        fileStore.selectedFileId = id;
    },

    clearFiles: () => {
        fileStore.files = [];
        fileStore.selectedFileId = null;
    },
});
