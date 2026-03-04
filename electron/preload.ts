import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openCsv: () => ipcRenderer.invoke('open-csv'),
  saveCsv: (filePath: string, content: string) =>
    ipcRenderer.invoke('save-csv', filePath, content),
  saveCsvAs: (content: string) => ipcRenderer.invoke('save-csv-as', content),

  // Dialogs
  confirmUnsavedChanges: () => ipcRenderer.invoke('confirm-unsaved-changes'),

  // Privacy
  panicClose: () => ipcRenderer.invoke('panic-close'),
  getPortableInfo: () => ipcRenderer.invoke('get-portable-info'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),

  // Menu listeners
  onMenuNew: (callback: () => void) => {
    ipcRenderer.on('menu:new', callback);
    return () => ipcRenderer.removeListener('menu:new', callback);
  },
  onMenuOpen: (callback: () => void) => {
    ipcRenderer.on('menu:open', callback);
    return () => ipcRenderer.removeListener('menu:open', callback);
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu:save', callback);
    return () => ipcRenderer.removeListener('menu:save', callback);
  },
  onMenuSaveAs: (callback: () => void) => {
    ipcRenderer.on('menu:saveAs', callback);
    return () => ipcRenderer.removeListener('menu:saveAs', callback);
  },
  onMenuUndo: (callback: () => void) => {
    ipcRenderer.on('menu:undo', callback);
    return () => ipcRenderer.removeListener('menu:undo', callback);
  },
  onMenuRedo: (callback: () => void) => {
    ipcRenderer.on('menu:redo', callback);
    return () => ipcRenderer.removeListener('menu:redo', callback);
  },
});

// Type definitions for the exposed API
export interface ElectronAPI {
  openCsv: () => Promise<{ path: string; content: string; name: string } | null>;
  saveCsv: (
    filePath: string,
    content: string
  ) => Promise<{ success: boolean; error?: string }>;
  saveCsvAs: (content: string) => Promise<{
    success: boolean;
    path?: string;
    name?: string;
    error?: string;
  } | null>;
  confirmUnsavedChanges: () => Promise<'save' | 'dontSave' | 'cancel'>;
  panicClose: () => Promise<void>;
  getPortableInfo: () => Promise<{
    isPortable: boolean;
    portablePath: string;
    isDev: boolean;
  }>;
  getAppVersion: () => Promise<string>;
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  onMenuNew: (callback: () => void) => () => void;
  onMenuOpen: (callback: () => void) => () => void;
  onMenuSave: (callback: () => void) => () => void;
  onMenuSaveAs: (callback: () => void) => () => void;
  onMenuUndo: (callback: () => void) => () => void;
  onMenuRedo: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
