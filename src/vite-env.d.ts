/// <reference types="vite/client" />

interface Window {
  electronAPI: {
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
    onMenuNew: (callback: () => void) => () => void;
    onMenuOpen: (callback: () => void) => () => void;
    onMenuSave: (callback: () => void) => () => void;
    onMenuSaveAs: (callback: () => void) => () => void;
    onMenuUndo: (callback: () => void) => () => void;
    onMenuRedo: (callback: () => void) => () => void;
  };
}
