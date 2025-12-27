# Implementation Plan: whatjsx

## 1. Project Setup
- **Stack**: Vite + React + TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: 
  - `valtio` for persistent state (user preferences, history).
  - `jotai` for transient UI state.
- **File Handling**: `browser-fs-access` for modern file system access.
- **Environment**: Browser-first, but core logic compatible with Node.js.

## 2. Core Logic (Transformation)
- **Library**: `jscodeshift` (with `recast`) or `@babel/standalone`.
  - *Decision*: Use `jscodeshift` as it is the industry standard for codemods and preserves formatting better than Babel. It can run in the browser.
- **Feature**: Convert `React.createElement` to JSX.
- **Structure**: Extract transformation logic into a pure function decoupled from the UI.

## 3. UI Architecture
- **Layout**: 
  - Sidebar: File Explorer (loaded files/folders).
  - Main Area: Tabbed view (Original Source | Converted JSX).
- **Drag & Drop**: 
  - Implementation based on `ui-drop-it-doc.tsx` (User to provide).
  - Support for files and folders (`webkitdirectory`).

## 4. Implementation Steps
1.  **Initialize Workspace**: Create Vite project with Tailwind v4.
2.  **Setup State**: Configure Valtio store for file list and settings.
3.  **Core Transformer**: Implement `transform(code: string): string` using `jscodeshift`.
4.  **UI Components**:
    - `DropZone`: Handle file/folder drops.
    - `FileExplorer`: List files.
    - `CodeEditor`: Monaco Editor or simple syntax highlighter for diffs.
5.  **Integration**: Connect file loading -> state -> transformer -> UI.

## 5. Missing Resources
- Need content of: `C:\y\w\2-web\0-dp\utils\trace-viewer-25\src\components\ui\local-ui\6-dnd\ui-drop-it-doc.tsx`
