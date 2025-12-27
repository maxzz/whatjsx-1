import { useSnapshot } from 'valtio';
import { fileStore } from '../store/file-store';
import { clsx } from 'clsx';
import { FileCode, FolderOpen } from 'lucide-react';
import { fileOpen, directoryOpen } from 'browser-fs-access';

export function Sidebar() {
  const snap = useSnapshot(fileStore);

  const handleOpenFile = async () => {
    try {
      const files = await fileOpen({
        mimeTypes: ['text/javascript', 'application/javascript'],
        extensions: ['.js', '.mjs', '.jsx'],
        multiple: true,
        description: 'JavaScript Files',
      });
      
      for (const file of files) {
        fileStore.addFile(file);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  };

  const handleOpenFolder = async () => {
    try {
      const files = await directoryOpen({
        recursive: true,
      });
      
      for (const file of files) {
        if (file.name.endsWith('.js') || file.name.endsWith('.mjs') || file.name.endsWith('.jsx')) {
            fileStore.addFile(file as File, (file as any).webkitRelativePath);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
      }
    }
  };

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Explorer</h2>
        <div className="flex gap-2">
          <button
            onClick={handleOpenFile}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            title="Open Files"
          >
            <FileCode size={16} />
            Files
          </button>
          <button
            onClick={handleOpenFolder}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
            title="Open Folder"
          >
            <FolderOpen size={16} />
            Folder
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {snap.files.length === 0 ? (
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
            {snap.files.map((file) => (
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
                <FileCode size={14} className={file.error ? "text-red-400" : "text-blue-400"} />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
