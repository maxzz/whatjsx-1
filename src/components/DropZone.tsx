import { useEffect, useRef, useState } from 'react';
import { fileStore } from '../store/file-store';

// Helper to handle file/folder entries recursively
async function scanFiles(item: FileSystemEntry, path = ''): Promise<File[]> {
    if (item.isFile) {
        return new Promise((resolve) => {
            (item as FileSystemFileEntry).file((file) => {
                // Monkey patch path for display
                Object.defineProperty(file, 'webkitRelativePath', {
                    value: path + file.name,
                });
                resolve([file]);
            });
        });
    } else if (item.isDirectory) {
        const dirReader = (item as FileSystemDirectoryEntry).createReader();
        return new Promise((resolve) => {
            dirReader.readEntries(async (entries) => {
                const files: File[] = [];
                for (const entry of entries) {
                    const subFiles = await scanFiles(entry, path + item.name + '/');
                    files.push(...subFiles);
                }
                resolve(files);
            });
        });
    }
    return [];
}

export function DropZone() {
    const [isDragging, setIsDragging] = useState(false);
    const dragCounter = useRef(0);

    useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current++;
            if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
                setIsDragging(true);
            }
        };

        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter.current--;
            if (dragCounter.current === 0) {
                setIsDragging(false);
            }
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = async (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            dragCounter.current = 0;

            const items = e.dataTransfer?.items;
            if (!items) return;

            const queue: Promise<File[]>[] = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item) {
                    queue.push(scanFiles(item));
                }
            }

            const results = await Promise.all(queue);
            results.flat().forEach(file => {
                if (file.name.endsWith('.js') || file.name.endsWith('.mjs') || file.name.endsWith('.jsx')) {
                    fileStore.addFile(file, file.webkitRelativePath);
                }
            });
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, []);

    if (!isDragging) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div className="text-4xl font-bold text-white animate-bounce">
                Drop files to process
            </div>
        </div>
    );
}
