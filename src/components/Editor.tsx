import { useSnapshot } from 'valtio';
import { fileStore } from '../store/file-store';
import { useState } from 'react';
import { clsx } from 'clsx';

export function Editor() {
  const snap = useSnapshot(fileStore);
  const file = snap.files.find(f => f.id === snap.selectedFileId);
  const [activeTab, setActiveTab] = useState<'original' | 'converted'>('converted');

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-950 text-gray-500">
        Select a file to view
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden">
      <div className="flex border-b border-gray-800 bg-gray-900">
        <button
          onClick={() => setActiveTab('original')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2',
            activeTab === 'original'
              ? 'border-blue-500 text-white bg-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          )}
        >
          Original Source
        </button>
        <button
          onClick={() => setActiveTab('converted')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors border-b-2',
            activeTab === 'converted'
              ? 'border-blue-500 text-white bg-gray-800'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          )}
        >
          Converted JSX
        </button>
        <div className="flex-1 flex items-center justify-end px-4 text-xs text-gray-500">
            {file.path}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {file.error ? (
            <div className="p-4 bg-red-900/20 border border-red-900/50 rounded text-red-200">
                <h3 className="font-bold mb-2">Transformation Error</h3>
                <pre className="whitespace-pre-wrap font-mono text-sm">{file.error}</pre>
            </div>
        ) : (
            <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">
            {activeTab === 'original' ? file.content : file.converted}
            </pre>
        )}
      </div>
    </div>
  );
}
