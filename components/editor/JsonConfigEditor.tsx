import { Clipboard, FileInput, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DeviceProfile } from '../../types/device';
import { formatValidationIssues, validateDeviceProfile } from '../../utils/validation';
import { Button } from '../common/Button';
import { useToast } from '../common/ToastProvider';

interface JsonConfigEditorProps {
  value: DeviceProfile;
  onApply: (value: DeviceProfile) => void;
}

function serialize(value: DeviceProfile): string {
  return JSON.stringify(value, null, 2);
}

export function JsonConfigEditor({ value, onApply }: JsonConfigEditorProps) {
  const [text, setText] = useState(() => serialize(value));
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    setText(serialize(value));
    setError('');
  }, [value]);

  const copyJson = async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error('当前环境不支持剪贴板 API。');
      }
      await navigator.clipboard.writeText(text);
      showToast('设备 JSON 已复制。');
    } catch (copyError: unknown) {
      const detail = copyError instanceof Error ? copyError.message : '未知错误';
      showToast(`复制失败：${detail}`, 'error');
    }
  };

  const applyJson = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (parseError: unknown) {
      const detail = parseError instanceof Error ? parseError.message : '未知 JSON 解析错误';
      setError(`JSON 解析失败：${detail}`);
      showToast('JSON 解析失败，请检查语法。', 'error');
      return;
    }

    const result = validateDeviceProfile(parsed);
    if (!result.success) {
      const detail = formatValidationIssues(result.issues);
      setError(detail);
      showToast(`配置校验失败，共 ${result.issues.length} 项。`, 'error');
      return;
    }

    setError('');
    onApply(result.data);
    showToast('JSON 已覆盖当前表单；设备身份字段已由编辑器保护。');
  };

  const reset = () => {
    setText(serialize(value));
    setError('');
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[#e7e7ec] bg-[#fafafd] p-4">
        <div>
          <h3 className="text-sm font-semibold text-[#2f3037]">设备 JSON</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#7c7e87]">
            可直接编辑完整配置并覆盖表单。保存模式、设备 ID、系统标记和时间戳由编辑器统一维护。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void copyJson()}>
            <Clipboard className="size-4" aria-hidden="true" /> 复制 JSON
          </Button>
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" /> 恢复表单 JSON
          </Button>
          <Button variant="primary" onClick={applyJson}>
            <FileInput className="size-4" aria-hidden="true" /> 使用 JSON 覆盖
          </Button>
        </div>
      </div>

      <label className="grid gap-2 text-sm font-medium text-[#3f4048]">
        JSON 配置
        <textarea
          value={text}
          spellCheck={false}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'device-json-error' : undefined}
          onChange={(event) => {
            setText(event.currentTarget.value);
            if (error) setError('');
          }}
          className="min-h-[440px] w-full resize-y rounded-xl border border-[#dcdce3] bg-[#17181d] p-4 font-mono text-xs leading-5 text-[#e8e8eb] outline-none focus:border-[#8975f7] focus:ring-2 focus:ring-[#ebe7ff]"
        />
      </label>

      {error ? (
        <div
          id="device-json-error"
          role="alert"
          className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl border border-[#f0cece] bg-[#fff6f6] p-3 font-mono text-xs leading-5 text-[#a83232]"
        >
          {error}
        </div>
      ) : (
        <p className="text-xs leading-5 text-[#777984]" role="status">
          当前 JSON 与表单同步。摄像头和显示特征数组会完整保留。
        </p>
      )}
    </div>
  );
}
