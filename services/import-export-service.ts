import type { DeviceProfile } from '../types/device';
import type {
  DeviceExportFile,
  DeviceImportConflict,
  DeviceImportFailure,
  DeviceImportResult,
  ImportConflictStrategy,
} from '../types/storage';
import { cloneDeviceProfile, copyDeviceAsCustom } from '../utils/device-profile';
import { createId } from '../utils/id';
import {
  DeviceValidationError,
  type ValidationIssue,
  type ValidationResult,
  validateDeviceExportFile,
  validateDeviceProfile,
} from '../utils/validation';

export const DEVICE_EXPORT_SCHEMA_VERSION = 1;

export interface ImportDevicesOptions {
  conflictStrategy: ImportConflictStrategy;
  now?: number;
  idFactory?: () => string;
}

export type DeviceJsonImportResult =
  | {
      success: true;
      data: DeviceImportResult;
    }
  | {
      success: false;
      issues: ValidationIssue[];
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertTimestamp(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite, non-negative timestamp.`);
  }
}

function issue(path: string, message: string, code: ValidationIssue['code']): ValidationIssue {
  return { path, message, code };
}

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

function getUniqueId(usedIds: ReadonlySet<string>, idFactory: () => string): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = idFactory();
    if (id.trim().length > 0 && !usedIds.has(id)) {
      return id;
    }
  }

  throw new Error('无法生成唯一设备 ID。');
}

function getUniqueCopyName(sourceName: string, usedNames: ReadonlySet<string>): string {
  const base = `${sourceName.trim()} 副本`;
  if (!usedNames.has(normalizedName(base))) {
    return base;
  }

  let counter = 2;
  while (usedNames.has(normalizedName(`${base} ${counter}`))) {
    counter += 1;
  }
  return `${base} ${counter}`;
}

function conflictReason(
  idConflict: boolean,
  nameConflict: boolean,
): DeviceImportConflict['reason'] {
  if (idConflict && nameConflict) {
    return 'id-and-name';
  }
  return idConflict ? 'id' : 'name';
}

function createConflict(
  imported: DeviceProfile,
  existing: DeviceProfile,
  hasIdConflict: boolean,
  hasNameConflict: boolean,
  resolution: ImportConflictStrategy,
): DeviceImportConflict {
  return {
    importedDeviceId: imported.id,
    importedDeviceName: imported.name,
    existingDeviceId: existing.id,
    existingDeviceName: existing.name,
    reason: conflictReason(hasIdConflict, hasNameConflict),
    resolution,
  };
}

export function createDeviceExportFile(
  devices: readonly DeviceProfile[],
  exportedAt = Date.now(),
): DeviceExportFile {
  assertTimestamp(exportedAt, 'exportedAt');

  const sanitizedDevices: DeviceProfile[] = [];
  const issues: ValidationIssue[] = [];
  devices.forEach((device, index) => {
    const result = validateDeviceProfile(device);
    if (result.success) {
      sanitizedDevices.push(result.data);
      return;
    }

    result.issues.forEach((item) => {
      issues.push({
        ...item,
        path: item.path.replace(/^\$/, `$.devices[${index}]`),
      });
    });
  });

  if (issues.length > 0) {
    throw new DeviceValidationError('无法导出无效的设备配置。', issues);
  }

  return {
    schemaVersion: DEVICE_EXPORT_SCHEMA_VERSION,
    exportedAt,
    devices: sanitizedDevices,
  };
}

export function serializeDeviceExport(
  devices: readonly DeviceProfile[],
  options: { exportedAt?: number; pretty?: boolean } = {},
): string {
  const exportFile = createDeviceExportFile(devices, options.exportedAt ?? Date.now());
  return JSON.stringify(exportFile, null, options.pretty === false ? undefined : 2);
}

export function parseDeviceExportJson(json: string): ValidationResult<DeviceExportFile> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : '未知 JSON 解析错误';
    return {
      success: false,
      valid: false,
      issues: [issue('$', `JSON 解析失败：${detail}`, 'schema')],
    };
  }

  return validateDeviceExportFile(parsed, DEVICE_EXPORT_SCHEMA_VERSION);
}

export async function readDeviceExportFile(
  file: Blob,
): Promise<ValidationResult<DeviceExportFile>> {
  return parseDeviceExportJson(await file.text());
}

export function createDeviceExportBlob(devices: readonly DeviceProfile[]): Blob {
  return new Blob([serializeDeviceExport(devices)], {
    type: 'application/json;charset=utf-8',
  });
}

export function buildDeviceExportFilename(label = 'devices', date = new Date()): string {
  const safeLabel =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z\d\u4e00-\u9fff]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'devices';
  return `device-simulator-${safeLabel}-${date.toISOString().slice(0, 10)}.json`;
}

/**
 * Resolves valid imported devices against an existing device collection. The
 * returned collection is a deep copy and system presets are never overwritten.
 */
export function mergeImportedDevices(
  importedDevices: readonly DeviceProfile[],
  existingDevices: readonly DeviceProfile[],
  options: ImportDevicesOptions,
): DeviceImportResult {
  const now = options.now ?? Date.now();
  assertTimestamp(now, 'now');
  const idFactory = options.idFactory ?? createId;
  const devices = existingDevices.map(cloneDeviceProfile);
  const accepted: DeviceProfile[] = [];
  const conflicts: DeviceImportConflict[] = [];
  let overwrittenCount = 0;
  let copiedCount = 0;
  let skippedCount = 0;
  const failures: DeviceImportFailure[] = [];

  for (const [sourceIndex, source] of importedDevices.entries()) {
    const sourceValidation = validateDeviceProfile(source);
    if (!sourceValidation.success) {
      failures.push({
        index: sourceIndex,
        ...(typeof source.name === 'string' ? { deviceName: source.name } : {}),
        issues: sourceValidation.issues.map((item) => ({
          path: item.path.replace(/^\$/, `$.devices[${sourceIndex}]`),
          message: item.message,
        })),
      });
      continue;
    }

    const usedIds = new Set(devices.map((device) => device.id));
    const usedNames = new Set(devices.map((device) => normalizedName(device.name)));
    let imported = sourceValidation.data;

    if (imported.isSystem) {
      usedIds.add(imported.id);
      imported = copyDeviceAsCustom(imported, {
        id: getUniqueId(usedIds, idFactory),
        name: imported.name,
        now,
        favorite: imported.favorite,
      });
    } else {
      imported = {
        ...cloneDeviceProfile(imported),
        isSystem: false,
        confidence: 'unverified',
      };
    }

    const idIndex = devices.findIndex((device) => device.id === imported.id);
    const nameIndex = devices.findIndex(
      (device) => normalizedName(device.name) === normalizedName(imported.name),
    );
    const hasIdConflict = idIndex >= 0;
    const hasNameConflict = nameIndex >= 0;

    if (!hasIdConflict && !hasNameConflict) {
      devices.push(imported);
      accepted.push(imported);
      continue;
    }

    const conflictIndex = idIndex >= 0 ? idIndex : nameIndex;
    const conflictingDevice = devices[conflictIndex];
    if (conflictingDevice === undefined) {
      throw new Error('导入冲突索引无效。');
    }

    const pointsToDifferentDevices = idIndex >= 0 && nameIndex >= 0 && idIndex !== nameIndex;
    const mustCopy =
      options.conflictStrategy === 'copy' ||
      (options.conflictStrategy === 'overwrite' &&
        (conflictingDevice.isSystem || pointsToDifferentDevices));

    if (options.conflictStrategy === 'skip') {
      conflicts.push(
        createConflict(imported, conflictingDevice, hasIdConflict, hasNameConflict, 'skip'),
      );
      skippedCount += 1;
      continue;
    }

    if (mustCopy) {
      usedIds.add(imported.id);
      const copy = copyDeviceAsCustom(imported, {
        id: getUniqueId(usedIds, idFactory),
        name: getUniqueCopyName(imported.name, usedNames),
        now,
        favorite: imported.favorite,
      });
      conflicts.push(
        createConflict(imported, conflictingDevice, hasIdConflict, hasNameConflict, 'copy'),
      );
      devices.push(copy);
      accepted.push(copy);
      copiedCount += 1;
      continue;
    }

    const replacement: DeviceProfile = {
      ...cloneDeviceProfile(imported),
      isSystem: false,
      createdAt: conflictingDevice.createdAt,
      updatedAt: now,
    };
    conflicts.push(
      createConflict(imported, conflictingDevice, hasIdConflict, hasNameConflict, 'overwrite'),
    );
    devices[conflictIndex] = replacement;
    accepted.push(replacement);
    overwrittenCount += 1;
  }

  return {
    devices,
    importedDevices: accepted,
    importedCount: accepted.length,
    overwrittenCount,
    copiedCount,
    skippedCount,
    failedCount: failures.length,
    conflicts,
    failures,
  };
}

function validateImportEnvelope(
  value: unknown,
): { success: true; devices: unknown[] } | { success: false; issues: ValidationIssue[] } {
  if (!isRecord(value)) {
    return {
      success: false,
      issues: [issue('$', '导入内容必须是 JSON 对象。', 'type')],
    };
  }

  const issues: ValidationIssue[] = [];
  if (typeof value.schemaVersion !== 'number' || !Number.isInteger(value.schemaVersion)) {
    issues.push(issue('$.schemaVersion', 'schemaVersion 必须是整数。', 'type'));
  } else if (value.schemaVersion !== DEVICE_EXPORT_SCHEMA_VERSION) {
    issues.push(
      issue(
        '$.schemaVersion',
        `不支持 schemaVersion ${value.schemaVersion}，当前仅支持 ${DEVICE_EXPORT_SCHEMA_VERSION}。`,
        'schema',
      ),
    );
  }

  if (
    typeof value.exportedAt !== 'number' ||
    !Number.isFinite(value.exportedAt) ||
    value.exportedAt < 0
  ) {
    issues.push(issue('$.exportedAt', 'exportedAt 必须是非负有限数字。', 'type'));
  }

  if (!Array.isArray(value.devices)) {
    issues.push(issue('$.devices', 'devices 必须是数组。', 'type'));
  }

  if (issues.length > 0 || !Array.isArray(value.devices)) {
    return { success: false, issues };
  }

  return { success: true, devices: value.devices };
}

/**
 * Parses and imports JSON. Invalid individual devices are reported and skipped,
 * while a malformed envelope or unsupported schema rejects the complete file.
 */
export function importDevicesFromJson(
  json: string,
  existingDevices: readonly DeviceProfile[],
  options: ImportDevicesOptions,
): DeviceJsonImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : '未知 JSON 解析错误';
    return {
      success: false,
      issues: [issue('$', `JSON 解析失败：${detail}`, 'schema')],
    };
  }

  const envelope = validateImportEnvelope(parsed);
  if (!envelope.success) {
    return envelope;
  }

  const validDevices: DeviceProfile[] = [];
  const failures: DeviceImportFailure[] = [];
  envelope.devices.forEach((value, index) => {
    const result = validateDeviceProfile(value);
    if (result.success) {
      validDevices.push(result.data);
      return;
    }

    const deviceName = isRecord(value) && typeof value.name === 'string' ? value.name : undefined;
    failures.push({
      index,
      ...(deviceName === undefined ? {} : { deviceName }),
      issues: result.issues.map((item) => ({
        path: item.path.replace(/^\$/, `$.devices[${index}]`),
        message: item.message,
      })),
    });
  });

  const merged = mergeImportedDevices(validDevices, existingDevices, options);
  return {
    success: true,
    data: {
      ...merged,
      failedCount: failures.length,
      failures,
    },
  };
}

export const parseDeviceExport = parseDeviceExportJson;
export const importDeviceProfiles = mergeImportedDevices;
