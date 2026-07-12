import type {
  CameraPosition,
  DeviceCamera,
  DeviceCategory,
  DeviceFeatureStyle,
  DeviceFrameConfig,
  DeviceProfile,
  DeviceViewportConfig,
  DisplayFeature,
  SafeAreaInsets,
} from '../types/device';
import type { DeviceExportFile } from '../types/storage';

export type ValidationIssueCode = 'required' | 'type' | 'range' | 'enum' | 'duplicate' | 'schema';

export interface ValidationIssue {
  path: string;
  message: string;
  code: ValidationIssueCode;
}

export type ValidationResult<T> =
  | {
      success: true;
      valid: true;
      data: T;
      issues: [];
    }
  | {
      success: false;
      valid: false;
      issues: ValidationIssue[];
    };

interface NumberRules {
  min?: number;
  max?: number;
  exclusiveMin?: boolean;
  integer?: boolean;
}

type UnknownRecord = Record<string, unknown>;

const DEVICE_CATEGORIES: ReadonlySet<string> = new Set<DeviceCategory>([
  'phone',
  'tablet',
  'desktop',
  'foldable',
  'custom',
]);
const CAMERA_SHAPES: ReadonlySet<string> = new Set(['circle', 'ellipse', 'rounded-rect', 'rect']);
const CAMERA_LAYOUT_MODES: ReadonlySet<string> = new Set(['overlay', 'occupy']);
const HORIZONTAL_ANCHORS: ReadonlySet<string> = new Set(['left', 'center', 'right']);
const VERTICAL_ANCHORS: ReadonlySet<string> = new Set(['top', 'center', 'bottom']);
const DISPLAY_FEATURE_TYPES: ReadonlySet<string> = new Set([
  'home-indicator',
  'speaker',
  'hinge',
  'custom',
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: ValidationIssue[],
  path: string,
  message: string,
  code: ValidationIssueCode,
): void {
  issues.push({ path, message, code });
}

function validateObject(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is UnknownRecord {
  if (!isRecord(value)) {
    addIssue(issues, path, '必须是对象。', 'type');
    return false;
  }

  return true;
}

function validateString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): value is string {
  if (typeof value !== 'string') {
    addIssue(issues, path, '必须是字符串。', 'type');
    return false;
  }

  if (!options.allowEmpty && value.trim().length === 0) {
    addIssue(issues, path, '不能为空。', 'required');
    return false;
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    addIssue(issues, path, `长度不能超过 ${options.maxLength} 个字符。`, 'range');
    return false;
  }

  return true;
}

function validateOptionalString(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  options: { allowEmpty?: boolean; maxLength?: number } = {},
): boolean {
  return value === undefined || validateString(value, path, issues, options);
}

function validateBoolean(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is boolean {
  if (typeof value !== 'boolean') {
    addIssue(issues, path, '必须是布尔值。', 'type');
    return false;
  }

  return true;
}

function validateNumber(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  rules: NumberRules = {},
): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    addIssue(issues, path, '必须是有限数字，不能为 NaN。', 'type');
    return false;
  }

  if (rules.integer && !Number.isInteger(value)) {
    addIssue(issues, path, '必须是整数。', 'type');
    return false;
  }

  if (rules.min !== undefined) {
    const outsideMinimum = rules.exclusiveMin ? value <= rules.min : value < rules.min;
    if (outsideMinimum) {
      addIssue(
        issues,
        path,
        rules.exclusiveMin ? `必须大于 ${rules.min}。` : `不能小于 ${rules.min}。`,
        'range',
      );
      return false;
    }
  }

  if (rules.max !== undefined && value > rules.max) {
    addIssue(issues, path, `不能大于 ${rules.max}。`, 'range');
    return false;
  }

  return true;
}

function validateOptionalNumber(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  rules: NumberRules = {},
): boolean {
  return value === undefined || validateNumber(value, path, issues, rules);
}

function validateEnum(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  choices: ReadonlySet<string>,
): value is string {
  if (typeof value !== 'string' || !choices.has(value)) {
    addIssue(issues, path, `必须是以下值之一：${[...choices].join(', ')}。`, 'enum');
    return false;
  }

  return true;
}

function validateInsets(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): value is UnknownRecord {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateNumber(value.top, `${path}.top`, issues, { min: 0 });
  validateNumber(value.right, `${path}.right`, issues, { min: 0 });
  validateNumber(value.bottom, `${path}.bottom`, issues, { min: 0 });
  validateNumber(value.left, `${path}.left`, issues, { min: 0 });
  return issues.length === start;
}

function validateFeatureStyle(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (value === undefined) {
    return true;
  }

  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateOptionalString(value.backgroundColor, `${path}.backgroundColor`, issues, {
    maxLength: 128,
  });
  validateOptionalString(value.borderColor, `${path}.borderColor`, issues, {
    maxLength: 128,
  });
  validateOptionalNumber(value.borderWidth, `${path}.borderWidth`, issues, {
    min: 0,
  });
  validateOptionalNumber(value.opacity, `${path}.opacity`, issues, {
    min: 0,
    max: 1,
  });
  return issues.length === start;
}

function validateCameraPosition(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  if (value.mode === 'absolute') {
    const start = issues.length;
    validateNumber(value.x, `${path}.x`, issues);
    validateNumber(value.y, `${path}.y`, issues);
    return issues.length === start;
  }

  if (value.mode === 'anchor') {
    const start = issues.length;
    validateEnum(value.horizontal, `${path}.horizontal`, issues, HORIZONTAL_ANCHORS);
    validateEnum(value.vertical, `${path}.vertical`, issues, VERTICAL_ANCHORS);
    validateNumber(value.offsetX, `${path}.offsetX`, issues);
    validateNumber(value.offsetY, `${path}.offsetY`, issues);
    return issues.length === start;
  }

  addIssue(issues, `${path}.mode`, '必须是 absolute 或 anchor。', 'enum');
  return false;
}

function validateCamera(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateString(value.id, `${path}.id`, issues, { maxLength: 200 });
  validateString(value.name, `${path}.name`, issues, { maxLength: 120 });
  validateCameraPosition(value.position, `${path}.position`, issues);
  validateNumber(value.width, `${path}.width`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateNumber(value.height, `${path}.height`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateEnum(value.shape, `${path}.shape`, issues, CAMERA_SHAPES);
  validateOptionalNumber(value.borderRadius, `${path}.borderRadius`, issues, {
    min: 0,
  });
  validateOptionalNumber(value.rotation, `${path}.rotation`, issues);
  validateEnum(value.layoutMode, `${path}.layoutMode`, issues, CAMERA_LAYOUT_MODES);
  validateBoolean(value.visible, `${path}.visible`, issues);
  validateFeatureStyle(value.style, `${path}.style`, issues);
  return issues.length === start;
}

function validateDisplayFeature(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateString(value.id, `${path}.id`, issues, { maxLength: 200 });
  validateString(value.name, `${path}.name`, issues, { maxLength: 120 });
  validateEnum(value.type, `${path}.type`, issues, DISPLAY_FEATURE_TYPES);
  validateNumber(value.x, `${path}.x`, issues);
  validateNumber(value.y, `${path}.y`, issues);
  validateNumber(value.width, `${path}.width`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateNumber(value.height, `${path}.height`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateOptionalNumber(value.borderRadius, `${path}.borderRadius`, issues, {
    min: 0,
  });
  validateOptionalNumber(value.rotation, `${path}.rotation`, issues);
  validateBoolean(value.visible, `${path}.visible`, issues);
  validateFeatureStyle(value.style, `${path}.style`, issues);
  return issues.length === start;
}

function validateUniqueIds(values: unknown[], path: string, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (!isRecord(value) || typeof value.id !== 'string') {
      return;
    }

    if (seen.has(value.id)) {
      addIssue(issues, `${path}[${index}].id`, `ID “${value.id}” 在同一列表中重复。`, 'duplicate');
    }
    seen.add(value.id);
  });
}

function validateViewport(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateNumber(value.width, `${path}.width`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateNumber(value.height, `${path}.height`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateNumber(value.screenBorderRadius, `${path}.screenBorderRadius`, issues, {
    min: 0,
  });
  validateInsets(value.safeArea, `${path}.safeArea`, issues);

  if (!Array.isArray(value.cameras)) {
    addIssue(issues, `${path}.cameras`, '必须是数组。', 'type');
  } else {
    value.cameras.forEach((camera, index) => {
      validateCamera(camera, `${path}.cameras[${index}]`, issues);
    });
    validateUniqueIds(value.cameras, `${path}.cameras`, issues);
  }

  if (!Array.isArray(value.displayFeatures)) {
    addIssue(issues, `${path}.displayFeatures`, '必须是数组。', 'type');
  } else {
    value.displayFeatures.forEach((feature, index) => {
      validateDisplayFeature(feature, `${path}.displayFeatures[${index}]`, issues);
    });
    validateUniqueIds(value.displayFeatures, `${path}.displayFeatures`, issues);
  }

  return issues.length === start;
}

function validateFrame(value: unknown, path: string, issues: ValidationIssue[]): boolean {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateBoolean(value.enabled, `${path}.enabled`, issues);
  validateInsets(value.insets, `${path}.insets`, issues);
  validateNumber(value.borderRadius, `${path}.borderRadius`, issues, { min: 0 });
  validateString(value.backgroundColor, `${path}.backgroundColor`, issues, {
    maxLength: 128,
  });
  validateString(value.borderColor, `${path}.borderColor`, issues, {
    maxLength: 128,
  });
  validateNumber(value.borderWidth, `${path}.borderWidth`, issues, { min: 0 });
  validateBoolean(value.shadowEnabled, `${path}.shadowEnabled`, issues);
  validateOptionalString(value.shadow, `${path}.shadow`, issues, {
    maxLength: 256,
  });
  return issues.length === start;
}

function validateDeviceProfileShape(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  if (!validateObject(value, path, issues)) {
    return false;
  }

  const start = issues.length;
  validateString(value.id, `${path}.id`, issues, { maxLength: 200 });
  validateString(value.name, `${path}.name`, issues, { maxLength: 120 });
  validateOptionalString(value.brand, `${path}.brand`, issues, {
    maxLength: 120,
  });
  validateOptionalString(value.model, `${path}.model`, issues, {
    maxLength: 120,
  });
  validateEnum(value.category, `${path}.category`, issues, DEVICE_CATEGORIES);
  validateNumber(value.devicePixelRatio, `${path}.devicePixelRatio`, issues, {
    min: 0,
    exclusiveMin: true,
  });
  validateOptionalString(value.userAgent, `${path}.userAgent`, issues, {
    maxLength: 1024,
  });
  validateViewport(value.portrait, `${path}.portrait`, issues);
  validateViewport(value.landscape, `${path}.landscape`, issues);
  validateFrame(value.frame, `${path}.frame`, issues);
  validateBoolean(value.isSystem, `${path}.isSystem`, issues);
  validateBoolean(value.favorite, `${path}.favorite`, issues);

  if (!Array.isArray(value.tags)) {
    addIssue(issues, `${path}.tags`, '必须是字符串数组。', 'type');
  } else {
    value.tags.forEach((tag, index) => {
      validateString(tag, `${path}.tags[${index}]`, issues, {
        maxLength: 100,
      });
    });
  }

  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;
  const createdAtIsValid = validateNumber(createdAt, `${path}.createdAt`, issues, { min: 0 });
  const updatedAtIsValid = validateNumber(updatedAt, `${path}.updatedAt`, issues, { min: 0 });
  if (createdAtIsValid && updatedAtIsValid && updatedAt < createdAt) {
    addIssue(issues, `${path}.updatedAt`, '不能早于 createdAt。', 'range');
  }

  return issues.length === start;
}

function toFeatureStyle(value: UnknownRecord): DeviceFeatureStyle {
  return {
    ...(typeof value.backgroundColor === 'string'
      ? { backgroundColor: value.backgroundColor }
      : {}),
    ...(typeof value.borderColor === 'string' ? { borderColor: value.borderColor } : {}),
    ...(typeof value.borderWidth === 'number' ? { borderWidth: value.borderWidth } : {}),
    ...(typeof value.opacity === 'number' ? { opacity: value.opacity } : {}),
  };
}

function toCameraPosition(value: UnknownRecord): CameraPosition {
  if (value.mode === 'absolute') {
    return {
      mode: 'absolute',
      x: value.x as number,
      y: value.y as number,
    };
  }

  return {
    mode: 'anchor',
    horizontal: value.horizontal as 'left' | 'center' | 'right',
    vertical: value.vertical as 'top' | 'center' | 'bottom',
    offsetX: value.offsetX as number,
    offsetY: value.offsetY as number,
  };
}

function toCamera(value: UnknownRecord): DeviceCamera {
  return {
    id: value.id as string,
    name: value.name as string,
    position: toCameraPosition(value.position as UnknownRecord),
    width: value.width as number,
    height: value.height as number,
    shape: value.shape as DeviceCamera['shape'],
    ...(typeof value.borderRadius === 'number' ? { borderRadius: value.borderRadius } : {}),
    ...(typeof value.rotation === 'number' ? { rotation: value.rotation } : {}),
    layoutMode: value.layoutMode as DeviceCamera['layoutMode'],
    visible: value.visible as boolean,
    ...(isRecord(value.style) ? { style: toFeatureStyle(value.style) } : {}),
  };
}

function toDisplayFeature(value: UnknownRecord): DisplayFeature {
  return {
    id: value.id as string,
    name: value.name as string,
    type: value.type as DisplayFeature['type'],
    x: value.x as number,
    y: value.y as number,
    width: value.width as number,
    height: value.height as number,
    ...(typeof value.borderRadius === 'number' ? { borderRadius: value.borderRadius } : {}),
    ...(typeof value.rotation === 'number' ? { rotation: value.rotation } : {}),
    visible: value.visible as boolean,
    ...(isRecord(value.style) ? { style: toFeatureStyle(value.style) } : {}),
  };
}

function toInsets(value: UnknownRecord): SafeAreaInsets {
  return {
    top: value.top as number,
    right: value.right as number,
    bottom: value.bottom as number,
    left: value.left as number,
  };
}

function toViewport(value: UnknownRecord): DeviceViewportConfig {
  return {
    width: value.width as number,
    height: value.height as number,
    screenBorderRadius: value.screenBorderRadius as number,
    safeArea: toInsets(value.safeArea as UnknownRecord),
    cameras: (value.cameras as UnknownRecord[]).map(toCamera),
    displayFeatures: (value.displayFeatures as UnknownRecord[]).map(toDisplayFeature),
  };
}

function toFrame(value: UnknownRecord): DeviceFrameConfig {
  return {
    enabled: value.enabled as boolean,
    insets: toInsets(value.insets as UnknownRecord),
    borderRadius: value.borderRadius as number,
    backgroundColor: value.backgroundColor as string,
    borderColor: value.borderColor as string,
    borderWidth: value.borderWidth as number,
    shadowEnabled: value.shadowEnabled as boolean,
    ...(typeof value.shadow === 'string' ? { shadow: value.shadow } : {}),
  };
}

function toDeviceProfile(value: UnknownRecord): DeviceProfile {
  return {
    id: value.id as string,
    name: value.name as string,
    ...(typeof value.brand === 'string' ? { brand: value.brand } : {}),
    ...(typeof value.model === 'string' ? { model: value.model } : {}),
    category: value.category as DeviceCategory,
    devicePixelRatio: value.devicePixelRatio as number,
    ...(typeof value.userAgent === 'string' ? { userAgent: value.userAgent } : {}),
    portrait: toViewport(value.portrait as UnknownRecord),
    landscape: toViewport(value.landscape as UnknownRecord),
    frame: toFrame(value.frame as UnknownRecord),
    isSystem: value.isSystem as boolean,
    favorite: value.favorite as boolean,
    tags: [...(value.tags as string[])],
    createdAt: value.createdAt as number,
    updatedAt: value.updatedAt as number,
  };
}

function success<T>(data: T): ValidationResult<T> {
  return { success: true, valid: true, data, issues: [] };
}

function failure<T>(issues: ValidationIssue[]): ValidationResult<T> {
  return { success: false, valid: false, issues };
}

export function validateDeviceProfile(value: unknown): ValidationResult<DeviceProfile> {
  const issues: ValidationIssue[] = [];
  validateDeviceProfileShape(value, '$', issues);

  if (issues.length > 0 || !isRecord(value)) {
    return failure(issues);
  }

  return success(toDeviceProfile(value));
}

export function validateDeviceExportFile(
  value: unknown,
  expectedSchemaVersion?: number,
): ValidationResult<DeviceExportFile> {
  const issues: ValidationIssue[] = [];
  if (!validateObject(value, '$', issues)) {
    return failure(issues);
  }

  const schemaVersion = value.schemaVersion;
  const schemaIsValid = validateNumber(schemaVersion, '$.schemaVersion', issues, {
    min: 1,
    integer: true,
  });
  if (
    schemaIsValid &&
    expectedSchemaVersion !== undefined &&
    schemaVersion !== expectedSchemaVersion
  ) {
    addIssue(
      issues,
      '$.schemaVersion',
      `不支持 schemaVersion ${schemaVersion}，当前仅支持 ${expectedSchemaVersion}。`,
      'schema',
    );
  }

  validateNumber(value.exportedAt, '$.exportedAt', issues, { min: 0 });

  if (!Array.isArray(value.devices)) {
    addIssue(issues, '$.devices', '必须是设备数组。', 'type');
  } else {
    value.devices.forEach((device, index) => {
      validateDeviceProfileShape(device, `$.devices[${index}]`, issues);
    });
    validateUniqueIds(value.devices, '$.devices', issues);
  }

  if (issues.length > 0 || !Array.isArray(value.devices)) {
    return failure(issues);
  }

  return success({
    schemaVersion: value.schemaVersion as number,
    exportedAt: value.exportedAt as number,
    devices: value.devices.map((device) => toDeviceProfile(device as UnknownRecord)),
  });
}

export function isDeviceProfile(value: unknown): value is DeviceProfile {
  return validateDeviceProfile(value).success;
}

export function isDeviceExportFile(value: unknown): value is DeviceExportFile {
  return validateDeviceExportFile(value).success;
}

export class DeviceValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = 'DeviceValidationError';
    this.issues = issues;
  }
}

export function assertValidDeviceProfile(value: unknown): DeviceProfile {
  const result = validateDeviceProfile(value);
  if (!result.success) {
    throw new DeviceValidationError('设备配置校验失败。', result.issues);
  }

  return result.data;
}

export function formatValidationIssues(issues: ValidationIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n');
}
