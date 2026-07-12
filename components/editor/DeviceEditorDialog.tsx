import { AlertTriangle, Save } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { DeviceProfile } from '../../types/device';
import { cloneDeviceProfile, copyDeviceAsCustom } from '../../utils/device-profile';
import { createId } from '../../utils/id';
import { type ValidationIssue, validateDeviceProfile } from '../../utils/validation';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useToast } from '../common/ToastProvider';
import { DeviceBasicForm } from './DeviceBasicForm';
import { DeviceFrameForm } from './DeviceFrameForm';
import { DeviceViewportForm } from './DeviceViewportForm';
import { JsonConfigEditor } from './JsonConfigEditor';

export type DeviceEditorMode = 'add' | 'edit' | 'duplicate';

interface DeviceEditorDialogProps {
  open: boolean;
  mode: DeviceEditorMode;
  source?: DeviceProfile | undefined;
  onClose: () => void;
  onSave: (device: DeviceProfile) => void;
}

type EditorTab = 'basic' | 'portrait' | 'landscape' | 'frame' | 'json';

interface DraftIdentity {
  id: string;
  createdAt: number;
}

const TABS: ReadonlyArray<{ id: EditorTab; label: string }> = [
  { id: 'basic', label: '基本信息' },
  { id: 'portrait', label: '竖屏' },
  { id: 'landscape', label: '横屏' },
  { id: 'frame', label: '设备边框' },
  { id: 'json', label: 'JSON' },
];

function createBlankDevice(): DeviceProfile {
  const now = Date.now();
  return {
    id: createId(),
    name: '自定义设备',
    category: 'custom',
    devicePixelRatio: 1,
    portrait: {
      width: 390,
      height: 844,
      screenBorderRadius: 32,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      cameras: [],
      displayFeatures: [],
    },
    landscape: {
      width: 844,
      height: 390,
      screenBorderRadius: 32,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
      cameras: [],
      displayFeatures: [],
    },
    frame: {
      enabled: true,
      insets: { top: 10, right: 10, bottom: 10, left: 10 },
      borderRadius: 40,
      backgroundColor: '#1c1c1e',
      borderColor: '#4b4b50',
      borderWidth: 2,
      shadowEnabled: true,
      shadow: '0 20px 60px rgba(0, 0, 0, 0.22)',
    },
    isSystem: false,
    favorite: false,
    tags: ['custom'],
    createdAt: now,
    updatedAt: now,
  };
}

function initializeDraft(
  mode: DeviceEditorMode,
  source: DeviceProfile | undefined,
): DeviceProfile | null {
  if (mode === 'add') return createBlankDevice();
  if (!source) return null;

  if (mode === 'duplicate' || source.isSystem) {
    return copyDeviceAsCustom(source, {
      name: `${source.name} 副本`,
      favorite: false,
    });
  }

  return {
    ...cloneDeviceProfile(source),
    isSystem: false,
  };
}

function issueTab(issue: ValidationIssue): EditorTab {
  if (issue.path.startsWith('$.portrait')) return 'portrait';
  if (issue.path.startsWith('$.landscape')) return 'landscape';
  if (issue.path.startsWith('$.frame')) return 'frame';
  return 'basic';
}

function titleForMode(mode: DeviceEditorMode, source: DeviceProfile | undefined): string {
  if (mode === 'add') return '添加自定义设备';
  if (mode === 'duplicate' || source?.isSystem) return '复制并编辑设备';
  return '编辑设备';
}

export function DeviceEditorDialog({
  open,
  mode,
  source,
  onClose,
  onSave,
}: DeviceEditorDialogProps) {
  const [draft, setDraft] = useState<DeviceProfile | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('basic');
  const identityRef = useRef<DraftIdentity | null>(null);
  const tabIdPrefix = useId();
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) return;
    const initialized = initializeDraft(mode, source);
    setDraft(initialized);
    setActiveTab('basic');
    identityRef.current = initialized
      ? { id: initialized.id, createdAt: initialized.createdAt }
      : null;
  }, [mode, open, source]);

  const validation = useMemo(() => (draft ? validateDeviceProfile(draft) : null), [draft]);
  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    if (!validation || validation.success) return result;
    validation.issues.forEach((issue) => {
      result[issue.path] ??= issue.message;
    });
    return result;
  }, [validation]);

  const protectIdentity = (value: DeviceProfile): DeviceProfile => {
    const now = Date.now();
    const identity = identityRef.current ?? {
      id: createId(),
      createdAt: now,
    };
    identityRef.current = identity;
    return {
      ...cloneDeviceProfile(value),
      id: identity.id,
      isSystem: false,
      createdAt: identity.createdAt,
      updatedAt: Math.max(now, identity.createdAt),
    };
  };

  const save = () => {
    if (!draft) {
      showToast('缺少源设备，无法保存。', 'error');
      return;
    }

    const normalized = protectIdentity(draft);
    const result = validateDeviceProfile(normalized);
    if (!result.success) {
      const firstIssue = result.issues[0];
      if (firstIssue) setActiveTab(issueTab(firstIssue));
      showToast(`设备配置还有 ${result.issues.length} 项错误。`, 'error');
      return;
    }

    try {
      onSave(result.data);
      showToast(mode === 'edit' && !source?.isSystem ? '设备已保存。' : '自定义设备已创建。');
      onClose();
    } catch (saveError: unknown) {
      const detail = saveError instanceof Error ? saveError.message : '未知错误';
      showToast(`保存失败：${detail}`, 'error');
    }
  };

  const systemCopy = mode === 'edit' && source?.isSystem === true;
  const missingSource = mode !== 'add' && !source;
  const invalidIssues = validation && !validation.success ? validation.issues : [];

  return (
    <Modal
      open={open}
      wide
      title={titleForMode(mode, source)}
      description="竖屏和横屏分别保存；所有数值均为 CSS 像素。"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={draft === null} onClick={save}>
            <Save className="size-4" aria-hidden="true" /> 保存设备
          </Button>
        </>
      }
    >
      {missingSource || !draft ? (
        <div
          className="rounded-xl border border-[#f0cece] bg-[#fff6f6] p-4 text-sm text-[#a83232]"
          role="alert"
        >
          当前操作缺少源设备，请关闭弹窗后重试。
        </div>
      ) : (
        <div className="grid gap-4">
          {systemCopy ? (
            <div
              className="flex gap-2 rounded-xl border border-[#e6ddba] bg-[#fffaf0] p-3 text-xs leading-5 text-[#765c24]"
              role="status"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              系统预设不能直接修改。编辑器已创建新的 UUID，并会将结果保存为自定义设备。
            </div>
          ) : null}

          {invalidIssues.length > 0 ? (
            <div
              className="rounded-xl border border-[#f0cece] bg-[#fff6f6] p-3 text-xs text-[#a83232]"
              role="alert"
            >
              <p className="font-semibold">当前配置有 {invalidIssues.length} 项需要修正</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {invalidIssues.slice(0, 3).map((issue) => (
                  <li key={`${issue.path}-${issue.message}`}>
                    {issue.path}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            className="flex gap-1 overflow-x-auto rounded-xl border border-[#e5e5ea] bg-[#f5f5f8] p-1"
            role="tablist"
            aria-label="设备编辑分组"
          >
            {TABS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`${tabIdPrefix}-${tab.id}-tab`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${tabIdPrefix}-${tab.id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  className={`h-9 min-w-24 flex-1 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    selected
                      ? 'bg-white text-[#5b3ee4] shadow-sm'
                      : 'text-[#656771] hover:bg-white/70 hover:text-[#3f4048]'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div
            id={`${tabIdPrefix}-${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabIdPrefix}-${activeTab}-tab`}
            className="min-h-[480px]"
          >
            {activeTab === 'basic' ? (
              <DeviceBasicForm key={draft.id} value={draft} errors={errors} onChange={setDraft} />
            ) : null}
            {activeTab === 'portrait' ? (
              <DeviceViewportForm
                orientation="portrait"
                value={draft.portrait}
                errors={errors}
                onChange={(portrait) => setDraft({ ...draft, portrait })}
              />
            ) : null}
            {activeTab === 'landscape' ? (
              <DeviceViewportForm
                orientation="landscape"
                value={draft.landscape}
                errors={errors}
                onChange={(landscape) => setDraft({ ...draft, landscape })}
              />
            ) : null}
            {activeTab === 'frame' ? (
              <DeviceFrameForm
                value={draft.frame}
                errors={errors}
                onChange={(frame) => setDraft({ ...draft, frame })}
              />
            ) : null}
            {activeTab === 'json' ? (
              <JsonConfigEditor
                value={draft}
                onApply={(value) => setDraft(protectIdentity(value))}
              />
            ) : null}
          </div>
        </div>
      )}
    </Modal>
  );
}
