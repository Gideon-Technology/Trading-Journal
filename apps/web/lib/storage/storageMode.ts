export type StorageMode = 'localStorage' | 'pocketbase';

const MODE_KEY = 'gtrade.storage_mode';

export function getStorageMode(): StorageMode {
  if (typeof window === 'undefined') return 'localStorage';
  return (localStorage.getItem(MODE_KEY) as StorageMode) ?? 'localStorage';
}

export function setStorageMode(mode: StorageMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODE_KEY, mode);
}

export function isPocketBaseMode(): boolean {
  return getStorageMode() === 'pocketbase';
}
