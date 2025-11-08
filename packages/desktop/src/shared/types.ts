// Shared types between main and renderer processes

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
