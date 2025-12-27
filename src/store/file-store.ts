import { proxy } from 'valtio';
import { transform } from '../core/transform';

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

export const fileStore = proxy<FileStore>({
  files: [],
  selectedFileId: null,

  addFile: async (file: File, path?: string) => {
    try {
      const text = await file.text();
      let converted = '';
      let error = undefined;
      
      try {
        converted = transform(text);
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
