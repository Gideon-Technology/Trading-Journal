export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'gtrade.journal';
const LEGACY_KEY = 'forex-journal';

export function runMigration(): void {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('gtrade.schema_version');
  const version = stored ? parseInt(stored, 10) : 0;
  if (version >= SCHEMA_VERSION) return;

  // Migrate v1 data from old key to new key
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy && !localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_KEY);
  }

  localStorage.setItem('gtrade.schema_version', String(SCHEMA_VERSION));
}
