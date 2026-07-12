import type { DeviceProfile } from './device';

export interface PersistedState<T> {
  version: number;
  data: T;
}

export interface DeviceExportFile {
  schemaVersion: number;
  exportedAt: number;
  devices: DeviceProfile[];
}

export type ImportConflictStrategy = 'overwrite' | 'skip' | 'copy';

export interface ImportValidationIssue {
  path: string;
  message: string;
}

export interface DeviceImportFailure {
  index: number;
  deviceName?: string;
  issues: ImportValidationIssue[];
}

export interface DeviceImportConflict {
  importedDeviceId: string;
  importedDeviceName: string;
  existingDeviceId: string;
  existingDeviceName: string;
  reason: 'id' | 'name' | 'id-and-name';
  resolution: ImportConflictStrategy;
}

export interface DeviceImportResult {
  devices: DeviceProfile[];
  importedDevices: DeviceProfile[];
  importedCount: number;
  overwrittenCount: number;
  copiedCount: number;
  skippedCount: number;
  failedCount: number;
  conflicts: DeviceImportConflict[];
  failures: DeviceImportFailure[];
}
