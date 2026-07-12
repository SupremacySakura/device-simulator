import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileJson2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';

import { exportFilename } from '../../services/device-service';
import {
  buildDeviceExportFilename,
  createDeviceExportBlob,
  importDevicesFromJson,
} from '../../services/import-export-service';
import { useDeviceStore } from '../../stores/device-store';
import type { DeviceProfile } from '../../types/device';
import type { DeviceImportResult, ImportConflictStrategy } from '../../types/storage';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/ToastProvider';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_VISIBLE_ISSUES = 8;
const MAX_VISIBLE_FAILURES = 5;

type DialogMode = 'import' | 'export';
type ExportScope = 'current' | 'custom' | 'all';

interface DisplayIssue {
  path: string;
  message: string;
}

export interface ImportExportDialogProps {
  open: boolean;
  onClose: () => void;
  currentDevice: DeviceProfile | null | undefined;
}

const CONFLICT_OPTIONS: ReadonlyArray<{
  value: ImportConflictStrategy;
  label: string;
  description: string;
}> = [
  {
    value: 'copy',
    label: '创建副本',
    description: '保留现有设备，为冲突项生成新的 ID 和名称。',
  },
  {
    value: 'overwrite',
    label: '覆盖自定义设备',
    description: '用导入内容替换冲突的自定义设备；系统预设仍会创建副本。',
  },
  {
    value: 'skip',
    label: '跳过冲突项',
    description: '只导入没有 ID 或名称冲突的设备。',
  },
];

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(bytes < 1024 * 100 ? 1 : 0)} KB`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importedNewCount(result: DeviceImportResult): number {
  return Math.max(0, result.importedCount - result.overwrittenCount - result.copiedCount);
}

function ResultSummary({ result }: { result: DeviceImportResult }) {
  const newCount = importedNewCount(result);
  const hasAcceptedDevices = result.importedCount > 0;
  const stats = [
    { label: '成功', value: result.importedCount, color: 'text-[#25875a]' },
    { label: '覆盖', value: result.overwrittenCount, color: 'text-[#5361ba]' },
    { label: '复制', value: result.copiedCount, color: 'text-[#6547f5]' },
    { label: '跳过', value: result.skippedCount, color: 'text-[#9a6a14]' },
    { label: '失败', value: result.failedCount, color: 'text-[#c44343]' },
  ];

  return (
    <section
      className={`rounded-xl border p-3 ${
        hasAcceptedDevices ? 'border-[#cde8da] bg-[#f5fcf8]' : 'border-[#eadfbe] bg-[#fffaf0]'
      }`}
      aria-labelledby="import-result-heading"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        {hasAcceptedDevices ? (
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#25875a]" />
        ) : (
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#9a6a14]" />
        )}
        <div className="min-w-0 flex-1">
          <h4 id="import-result-heading" className="text-sm font-semibold text-[#303139]">
            {hasAcceptedDevices ? '导入处理完成' : '没有导入新设备'}
          </h4>
          <p className="mt-0.5 text-xs leading-5 text-[#73757e]">
            已逐项验证设备结构，并按所选冲突策略处理；其中新增 {newCount} 个。
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-5 gap-1.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-black/5 bg-white px-2 py-2 text-center"
          >
            <dt className="text-[10px] text-[#82848d]">{stat.label}</dt>
            <dd className={`mt-0.5 text-base font-semibold tabular-nums ${stat.color}`}>
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {result.failures.length > 0 ? (
        <details className="mt-3 rounded-lg border border-[#eadede] bg-white px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-[#9f3f3f]">
            查看失败详情（{result.failures.length}）
          </summary>
          <ul className="mt-2 grid gap-2 text-xs text-[#666872]">
            {result.failures.slice(0, MAX_VISIBLE_FAILURES).map((failure) => (
              <li key={`${failure.index}-${failure.deviceName ?? 'unknown'}`}>
                <strong className="font-medium text-[#41424a]">
                  #{failure.index + 1} {failure.deviceName ?? '未命名设备'}
                </strong>
                <ul className="mt-0.5 grid gap-0.5 pl-3">
                  {failure.issues.slice(0, 3).map((item) => (
                    <li key={`${item.path}-${item.message}`} className="break-words">
                      <code className="text-[10px] text-[#8a5960]">{item.path}</code>：
                      {item.message}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {result.failures.length > MAX_VISIBLE_FAILURES ? (
            <p className="mt-2 text-[11px] text-[#8b8d96]">
              另有 {result.failures.length - MAX_VISIBLE_FAILURES} 个失败项未展开显示。
            </p>
          ) : null}
        </details>
      ) : null}
    </section>
  );
}

export function ImportExportDialog({ open, onClose, currentDevice }: ImportExportDialogProps) {
  const devices = useDeviceStore((state) => state.devices);
  const replaceCustomDevices = useDeviceStore((state) => state.replaceCustomDevices);
  const { showToast } = useToast();
  const [mode, setMode] = useState<DialogMode>('import');
  const [exportScope, setExportScope] = useState<ExportScope>('current');
  const [conflictStrategy, setConflictStrategy] = useState<ImportConflictStrategy>('copy');
  const [jsonText, setJsonText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [issues, setIssues] = useState<DisplayIssue[]>([]);
  const [importResult, setImportResult] = useState<DeviceImportResult | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTabRef = useRef<HTMLButtonElement>(null);
  const exportTabRef = useRef<HTMLButtonElement>(null);
  const tabsId = useId();
  const conflictGroupName = useId();
  const fileInputId = useId();
  const jsonHelpId = useId();
  const issueListId = useId();

  const customDevices = useMemo(() => devices.filter((device) => !device.isSystem), [devices]);

  const exportDevices = useMemo<readonly DeviceProfile[]>(() => {
    if (exportScope === 'all') return devices;
    if (exportScope === 'custom') return customDevices;
    return currentDevice ? [currentDevice] : [];
  }, [currentDevice, customDevices, devices, exportScope]);

  const clearImportFeedback = () => {
    setIssues([]);
    setImportResult(null);
  };

  const resetAndClose = () => {
    setMode('import');
    setExportScope('current');
    setConflictStrategy('copy');
    setJsonText('');
    setFileName(null);
    setFileSize(null);
    setIssues([]);
    setImportResult(null);
    setIsReadingFile(false);
    setIsImporting(false);
    onClose();
  };

  const changeMode = (nextMode: DialogMode) => {
    setMode(nextMode);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const nextMode: DialogMode = mode === 'import' ? 'export' : 'import';
    changeMode(nextMode);
    if (nextMode === 'import') importTabRef.current?.focus();
    else exportTabRef.current?.focus();
  };

  const loadFile = async (file: File): Promise<void> => {
    clearImportFeedback();
    if (file.size > MAX_IMPORT_BYTES) {
      const message = `文件过大，最大支持 ${formatFileSize(MAX_IMPORT_BYTES)}。`;
      setIssues([{ path: '$', message }]);
      setFileName(file.name.slice(0, 180));
      setFileSize(file.size);
      setJsonText('');
      showToast(message, 'error');
      return;
    }

    setIsReadingFile(true);
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      if (text.trim().length === 0) {
        setIssues([{ path: '$', message: '所选文件为空。' }]);
        setJsonText('');
      } else {
        setJsonText(text);
      }
      setFileName(file.name.slice(0, 180));
      setFileSize(file.size);
    } catch (error: unknown) {
      const message = readableError(error, '无法读取所选文件。');
      setIssues([{ path: '$', message }]);
      setJsonText('');
      showToast(message, 'error');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) void loadFile(file);
  };

  const handleJsonChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setJsonText(event.currentTarget.value);
    setFileName(null);
    setFileSize(null);
    clearImportFeedback();
  };

  const handleImport = () => {
    const source = jsonText.trim();
    clearImportFeedback();
    if (source.length === 0) {
      setIssues([{ path: '$', message: '请选择 JSON 文件或粘贴导出内容。' }]);
      return;
    }

    const sourceBytes = new Blob([source]).size;
    if (sourceBytes > MAX_IMPORT_BYTES) {
      setIssues([
        {
          path: '$',
          message: `导入内容过大，最大支持 ${formatFileSize(MAX_IMPORT_BYTES)}。`,
        },
      ]);
      return;
    }

    setIsImporting(true);
    try {
      const parsed = importDevicesFromJson(source, devices, { conflictStrategy });
      if (!parsed.success) {
        const nextIssues = parsed.issues.map(({ path, message }) => ({ path, message }));
        setIssues(nextIssues);
        showToast('JSON 结构或 schema 校验失败。', 'error');
        return;
      }

      const result = parsed.data;
      if (result.importedCount > 0) {
        replaceCustomDevices(result.devices.filter((device) => !device.isSystem));
      }
      setImportResult(result);
      const newCount = importedNewCount(result);
      const summary = `新增 ${newCount}，覆盖 ${result.overwrittenCount}，复制 ${result.copiedCount}，跳过 ${result.skippedCount}，失败 ${result.failedCount}`;
      showToast(
        `导入完成：${summary}`,
        result.failedCount > 0 || result.skippedCount > 0 ? 'info' : 'success',
      );
    } catch (error: unknown) {
      const message = readableError(error, '导入时发生未知错误。');
      setIssues([{ path: '$', message }]);
      showToast(message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    if (exportDevices.length === 0) {
      showToast('当前范围内没有可导出的设备。', 'info');
      return;
    }

    try {
      const blob = createDeviceExportBlob(exportDevices);
      const filename =
        exportScope === 'current' && currentDevice
          ? exportFilename(currentDevice)
          : buildDeviceExportFilename(exportScope === 'custom' ? 'custom-devices' : 'all-devices');
      triggerDownload(blob, filename);
      showToast(`已导出 ${exportDevices.length} 个设备。`);
    } catch (error: unknown) {
      showToast(readableError(error, '设备配置导出失败。'), 'error');
    }
  };

  const exportOptions: ReadonlyArray<{
    value: ExportScope;
    label: string;
    description: string;
    count: number;
    disabled: boolean;
  }> = [
    {
      value: 'current',
      label: '当前设备',
      description: currentDevice ? currentDevice.name : '当前没有选中的设备',
      count: currentDevice ? 1 : 0,
      disabled: !currentDevice,
    },
    {
      value: 'custom',
      label: '全部自定义设备',
      description: '仅包含可以编辑和删除的自定义配置',
      count: customDevices.length,
      disabled: customDevices.length === 0,
    },
    {
      value: 'all',
      label: '完整设备集',
      description: '包含系统预设与全部自定义设备',
      count: devices.length,
      disabled: devices.length === 0,
    },
  ];

  const footer =
    mode === 'import' ? (
      <>
        <Button onClick={resetAndClose}>取消</Button>
        <Button
          variant="primary"
          loading={isImporting}
          disabled={jsonText.trim().length === 0 || isReadingFile}
          onClick={handleImport}
        >
          <Upload aria-hidden="true" className="size-4" />
          导入设备
        </Button>
      </>
    ) : (
      <>
        <Button onClick={resetAndClose}>取消</Button>
        <Button variant="primary" disabled={exportDevices.length === 0} onClick={handleExport}>
          <Download aria-hidden="true" className="size-4" />
          导出 {exportDevices.length} 个设备
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      wide
      title="导入 / 导出设备"
      description="使用带版本号的 JSON 配置，在浏览器或工作区之间迁移设备。"
      footer={footer}
      onClose={resetAndClose}
    >
      <div className="mx-auto max-w-3xl">
        <div
          role="tablist"
          aria-label="导入或导出"
          className="mb-5 grid grid-cols-2 rounded-xl border border-[#e1e1e7] bg-[#f5f5f8] p-1"
        >
          <button
            ref={importTabRef}
            id={`${tabsId}-import-tab`}
            type="button"
            role="tab"
            aria-selected={mode === 'import'}
            aria-controls={`${tabsId}-import-panel`}
            tabIndex={mode === 'import' ? 0 : -1}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'import'
                ? 'bg-white text-[#5237d4] shadow-sm'
                : 'text-[#6e7079] hover:text-[#34353c]'
            }`}
            onClick={() => changeMode('import')}
            onKeyDown={handleTabKeyDown}
          >
            <Upload aria-hidden="true" className="size-4" /> 导入
          </button>
          <button
            ref={exportTabRef}
            id={`${tabsId}-export-tab`}
            type="button"
            role="tab"
            aria-selected={mode === 'export'}
            aria-controls={`${tabsId}-export-panel`}
            tabIndex={mode === 'export' ? 0 : -1}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'export'
                ? 'bg-white text-[#5237d4] shadow-sm'
                : 'text-[#6e7079] hover:text-[#34353c]'
            }`}
            onClick={() => changeMode('export')}
            onKeyDown={handleTabKeyDown}
          >
            <Download aria-hidden="true" className="size-4" /> 导出
          </button>
        </div>

        {mode === 'import' ? (
          <div
            id={`${tabsId}-import-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-import-tab`}
            tabIndex={0}
            className="grid gap-5"
          >
            <section aria-labelledby="import-source-heading">
              <div className="mb-2 flex items-end justify-between gap-4">
                <div>
                  <h3 id="import-source-heading" className="text-sm font-semibold text-[#2c2d34]">
                    1. 选择导入内容
                  </h3>
                  <p className="mt-1 text-xs text-[#7b7d86]">
                    最大 {formatFileSize(MAX_IMPORT_BYTES)}；文件类型和内容都会在导入前验证。
                  </p>
                </div>
                <Button loading={isReadingFile} onClick={() => fileInputRef.current?.click()}>
                  <FileJson2 aria-hidden="true" className="size-4" /> 选择 JSON 文件
                </Button>
                <input
                  ref={fileInputRef}
                  id={fileInputId}
                  className="sr-only"
                  type="file"
                  accept="application/json,.json"
                  aria-label="选择设备 JSON 文件"
                  onChange={handleFileChange}
                />
              </div>

              {fileName ? (
                <div
                  className="mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-[#ddd9f5] bg-[#faf9ff] px-3 py-2 text-xs"
                  role="status"
                >
                  <FileJson2 aria-hidden="true" className="size-4 shrink-0 text-[#6547f5]" />
                  <span
                    className="min-w-0 flex-1 truncate font-medium text-[#42434b]"
                    title={fileName}
                  >
                    {fileName}
                  </span>
                  {fileSize === null ? null : (
                    <span className="shrink-0 text-[#898b94]">{formatFileSize(fileSize)}</span>
                  )}
                </div>
              ) : null}

              <label htmlFor={`${fileInputId}-json`} className="sr-only">
                设备配置 JSON
              </label>
              <textarea
                id={`${fileInputId}-json`}
                value={jsonText}
                rows={9}
                maxLength={MAX_IMPORT_BYTES}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={issues.length > 0}
                aria-describedby={`${jsonHelpId}${issues.length > 0 ? ` ${issueListId}` : ''}`}
                placeholder={
                  '也可以在这里粘贴 JSON，例如：\n{\n  "schemaVersion": 1,\n  "exportedAt": 0,\n  "devices": []\n}'
                }
                className={`w-full resize-y rounded-xl border bg-[#fcfcfe] p-3 font-mono text-xs leading-5 text-[#34353c] outline-none transition focus:ring-2 ${
                  issues.length > 0
                    ? 'border-[#e1a2a2] focus:border-[#d66b6b] focus:ring-[#fbe5e5]'
                    : 'border-[#dddde4] focus:border-[#8975f7] focus:ring-[#ebe7ff]'
                }`}
                onChange={handleJsonChange}
              />
              <div
                id={jsonHelpId}
                className="mt-1.5 flex justify-between gap-4 text-[11px] text-[#8b8d96]"
              >
                <span>只接受 Device Simulator 的版本化导出结构。</span>
                <span className="shrink-0 tabular-nums">
                  {jsonText.length.toLocaleString()} 字符
                </span>
              </div>

              {issues.length > 0 ? (
                <div
                  id={issueListId}
                  role="alert"
                  className="mt-3 rounded-xl border border-[#f0caca] bg-[#fff7f7] p-3"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#b13c3c]">
                    <AlertTriangle aria-hidden="true" className="size-4" />
                    导入内容未通过校验
                  </div>
                  <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-[#745b5d]">
                    {issues.slice(0, MAX_VISIBLE_ISSUES).map((item) => (
                      <li key={`${item.path}-${item.message}`} className="break-words">
                        <code className="rounded bg-white px-1 py-0.5 text-[10px] text-[#985158]">
                          {item.path}
                        </code>{' '}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                  {issues.length > MAX_VISIBLE_ISSUES ? (
                    <p className="mt-2 text-[11px] text-[#8b686b]">
                      另有 {issues.length - MAX_VISIBLE_ISSUES} 个问题未展开显示。
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>

            <fieldset>
              <legend className="text-sm font-semibold text-[#2c2d34]">2. 处理冲突设备</legend>
              <p className="mt-1 text-xs text-[#7b7d86]">
                ID 或设备名称相同会被视为冲突；系统设备不会被覆盖。
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {CONFLICT_OPTIONS.map((option) => {
                  const checked = conflictStrategy === option.value;
                  const descriptionId = `${conflictGroupName}-${option.value}-description`;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                        checked
                          ? 'border-[#9582f7] bg-[#f6f3ff]'
                          : 'border-[#e1e1e7] bg-white hover:border-[#cac7df]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={conflictGroupName}
                          value={option.value}
                          checked={checked}
                          aria-describedby={descriptionId}
                          className="size-4 accent-[#6547f5]"
                          onChange={() => {
                            setConflictStrategy(option.value);
                            clearImportFeedback();
                          }}
                        />
                        <span className="text-xs font-semibold text-[#37383f]">{option.label}</span>
                      </span>
                      <span
                        id={descriptionId}
                        className="mt-2 block text-[11px] leading-4 text-[#7f818a]"
                      >
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {importResult ? <ResultSummary result={importResult} /> : null}

            <div className="flex items-start gap-2 rounded-xl border border-[#dfe2ef] bg-[#f8f9fd] p-3 text-xs leading-5 text-[#646875]">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#5361ba]" />
              <p className="m-0">
                JSON 会作为不受信任的数据进行字段、类型、范围和 schema
                版本校验；导入不会执行其中的代码，也不会修改系统预设。
              </p>
            </div>
          </div>
        ) : (
          <div
            id={`${tabsId}-export-panel`}
            role="tabpanel"
            aria-labelledby={`${tabsId}-export-tab`}
            tabIndex={0}
          >
            <div>
              <h3 className="text-sm font-semibold text-[#2c2d34]">选择导出范围</h3>
              <p className="mt-1 text-xs text-[#7b7d86]">
                导出文件会包含 schema 版本和生成时间，可稍后重新导入。
              </p>
            </div>

            <fieldset className="mt-4 grid gap-2">
              <legend className="sr-only">设备导出范围</legend>
              {exportOptions.map((option) => {
                const checked = exportScope === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                      option.disabled
                        ? 'cursor-not-allowed border-[#ececf0] bg-[#f7f7f9] opacity-60'
                        : checked
                          ? 'cursor-pointer border-[#9582f7] bg-[#f6f3ff]'
                          : 'cursor-pointer border-[#e1e1e7] bg-white hover:border-[#cac7df]'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${conflictGroupName}-export`}
                      value={option.value}
                      checked={checked}
                      disabled={option.disabled}
                      className="size-4 shrink-0 accent-[#6547f5]"
                      onChange={() => setExportScope(option.value)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#36373f]">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[#7d7f88]">
                        {option.description}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-[#6547f5] shadow-sm">
                      {option.count}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="mt-5 flex items-start gap-2 rounded-xl border border-[#dfdbea] bg-[#faf9fd] p-3 text-xs leading-5 text-[#6c6e77]">
              <Copy aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#6547f5]" />
              <p className="m-0">
                导出只会生成本地 JSON
                下载，不会上传设备配置。再次导入系统预设时，它们会转换为可编辑的自定义副本。
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
