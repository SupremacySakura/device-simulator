import { AlertTriangle, Check } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import type { CameraPosition, DeviceCamera, DeviceViewportConfig } from '../../types/device';
import { getCameraOverflow, resolveCameraPosition } from '../../utils/camera-position';
import { Button } from '../common/Button';
import { SelectField, TextField } from '../common/FormField';

type AnchorPosition = Extract<CameraPosition, { mode: 'anchor' }>;

interface CameraFormProps {
  camera: DeviceCamera;
  viewport: DeviceViewportConfig;
  readOnly?: boolean;
  onChange: (camera: DeviceCamera) => void;
  onDone?: () => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number | 'any';
  disabled: boolean;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 'any',
  disabled,
  onChange,
}: NumberFieldProps) {
  return (
    <TextField
      label={label}
      type="number"
      value={value}
      step={step}
      disabled={disabled}
      {...(min === undefined ? {} : { min })}
      {...(max === undefined ? {} : { max })}
      onChange={(event) => {
        const next = event.currentTarget.valueAsNumber;
        if (!Number.isFinite(next)) return;
        if (min !== undefined && next < min) return;
        if (max !== undefined && next > max) return;
        onChange(next);
      }}
    />
  );
}

function horizontalOffset(
  anchor: AnchorPosition['horizontal'],
  x: number,
  cameraWidth: number,
  viewportWidth: number,
): number {
  if (anchor === 'left') return x;
  if (anchor === 'center') {
    return x - (viewportWidth / 2 - cameraWidth / 2);
  }
  return viewportWidth - cameraWidth - x;
}

function verticalOffset(
  anchor: AnchorPosition['vertical'],
  y: number,
  cameraHeight: number,
  viewportHeight: number,
): number {
  if (anchor === 'top') return y;
  if (anchor === 'center') {
    return y - (viewportHeight / 2 - cameraHeight / 2);
  }
  return viewportHeight - cameraHeight - y;
}

export function CameraForm({
  camera,
  viewport,
  readOnly = false,
  onChange,
  onDone,
}: CameraFormProps) {
  const [draftName, setDraftName] = useState(camera.name);

  useEffect(() => {
    setDraftName(camera.name);
  }, [camera.id, camera.name]);

  const patch = (next: Partial<DeviceCamera>) => {
    if (readOnly) return;
    onChange({ ...camera, ...next });
  };

  const commitName = () => {
    const name = draftName.trim();
    if (name.length === 0) {
      setDraftName(camera.name);
      return;
    }
    if (name !== camera.name) patch({ name });
  };

  const handleNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      setDraftName(camera.name);
      event.currentTarget.blur();
    }
  };

  const changeMode = (event: ChangeEvent<HTMLSelectElement>) => {
    const mode = event.currentTarget.value as CameraPosition['mode'];
    const resolved = resolveCameraPosition(camera, viewport);
    if (mode === 'absolute') {
      patch({ position: { mode: 'absolute', x: resolved.x, y: resolved.y } });
      return;
    }

    patch({
      position: {
        mode: 'anchor',
        horizontal: 'center',
        vertical: 'top',
        offsetX: horizontalOffset('center', resolved.x, camera.width, viewport.width),
        offsetY: resolved.y,
      },
    });
  };

  const changeHorizontalAnchor = (horizontal: AnchorPosition['horizontal']) => {
    if (camera.position.mode !== 'anchor') return;
    const resolved = resolveCameraPosition(camera, viewport);
    patch({
      position: {
        ...camera.position,
        horizontal,
        offsetX: horizontalOffset(horizontal, resolved.x, camera.width, viewport.width),
      },
    });
  };

  const changeVerticalAnchor = (vertical: AnchorPosition['vertical']) => {
    if (camera.position.mode !== 'anchor') return;
    const resolved = resolveCameraPosition(camera, viewport);
    patch({
      position: {
        ...camera.position,
        vertical,
        offsetY: verticalOffset(vertical, resolved.y, camera.height, viewport.height),
      },
    });
  };

  const changeAbsoluteCoordinate = (coordinate: 'x' | 'y', value: number) => {
    if (camera.position.mode !== 'absolute') return;
    patch({ position: { ...camera.position, [coordinate]: value } });
  };

  const changeAnchorOffset = (offset: 'offsetX' | 'offsetY', value: number) => {
    if (camera.position.mode !== 'anchor') return;
    patch({ position: { ...camera.position, [offset]: value } });
  };

  const overflow = getCameraOverflow(camera, viewport);
  const overflowParts = [
    overflow.top > 0 ? `上 ${overflow.top}px` : '',
    overflow.right > 0 ? `右 ${overflow.right}px` : '',
    overflow.bottom > 0 ? `下 ${overflow.bottom}px` : '',
    overflow.left > 0 ? `左 ${overflow.left}px` : '',
  ].filter(Boolean);

  return (
    <div className="mt-3 rounded-xl border border-[#ded9f8] bg-[#faf9ff] p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[#36313f]">摄像头属性</h4>
          <p className="mt-0.5 text-[11px] text-[#89838f]">坐标相对于屏幕左上角</p>
        </div>
        {readOnly ? (
          <span className="rounded-full bg-[#efeff3] px-2 py-1 text-[10px] font-medium text-[#777984]">
            只读
          </span>
        ) : null}
      </div>

      <div className="grid gap-3">
        <TextField
          label="名称"
          value={draftName}
          disabled={readOnly}
          maxLength={120}
          {...(draftName.trim().length === 0 ? { error: '名称不能为空' } : {})}
          onChange={(event) => setDraftName(event.currentTarget.value)}
          onBlur={commitName}
          onKeyDown={handleNameKeyDown}
        />

        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="定位模式"
            value={camera.position.mode}
            disabled={readOnly}
            onChange={changeMode}
          >
            <option value="anchor">锚点</option>
            <option value="absolute">绝对坐标</option>
          </SelectField>
          <SelectField
            label="占用模式"
            value={camera.layoutMode}
            disabled={readOnly}
            onChange={(event) =>
              patch({
                layoutMode: event.currentTarget.value as DeviceCamera['layoutMode'],
              })
            }
          >
            <option value="overlay">覆盖</option>
            <option value="occupy">占用提示</option>
          </SelectField>
        </div>

        {camera.position.mode === 'absolute' ? (
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="X"
              value={camera.position.x}
              disabled={readOnly}
              onChange={(x) => changeAbsoluteCoordinate('x', x)}
            />
            <NumberField
              label="Y"
              value={camera.position.y}
              disabled={readOnly}
              onChange={(y) => changeAbsoluteCoordinate('y', y)}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="水平锚点"
                value={camera.position.horizontal}
                disabled={readOnly}
                onChange={(event) =>
                  changeHorizontalAnchor(event.currentTarget.value as AnchorPosition['horizontal'])
                }
              >
                <option value="left">左</option>
                <option value="center">居中</option>
                <option value="right">右</option>
              </SelectField>
              <SelectField
                label="垂直锚点"
                value={camera.position.vertical}
                disabled={readOnly}
                onChange={(event) =>
                  changeVerticalAnchor(event.currentTarget.value as AnchorPosition['vertical'])
                }
              >
                <option value="top">上</option>
                <option value="center">居中</option>
                <option value="bottom">下</option>
              </SelectField>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="offsetX"
                value={camera.position.offsetX}
                disabled={readOnly}
                onChange={(offsetX) => changeAnchorOffset('offsetX', offsetX)}
              />
              <NumberField
                label="offsetY"
                value={camera.position.offsetY}
                disabled={readOnly}
                onChange={(offsetY) => changeAnchorOffset('offsetY', offsetY)}
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="宽度"
            value={camera.width}
            min={0.1}
            disabled={readOnly}
            onChange={(width) => patch({ width })}
          />
          <NumberField
            label="高度"
            value={camera.height}
            min={0.1}
            disabled={readOnly}
            onChange={(height) => patch({ height })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="形状"
            value={camera.shape}
            disabled={readOnly}
            onChange={(event) =>
              patch({ shape: event.currentTarget.value as DeviceCamera['shape'] })
            }
          >
            <option value="circle">圆形</option>
            <option value="ellipse">椭圆</option>
            <option value="rounded-rect">圆角矩形</option>
            <option value="rect">矩形</option>
          </SelectField>
          <NumberField
            label="圆角"
            value={camera.borderRadius ?? 0}
            min={0}
            disabled={readOnly}
            onChange={(borderRadius) => patch({ borderRadius })}
          />
        </div>

        <NumberField
          label="旋转角度"
          value={camera.rotation ?? 0}
          step={1}
          disabled={readOnly}
          onChange={(rotation) => patch({ rotation })}
        />

        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="背景颜色"
            value={camera.style?.backgroundColor ?? '#000000'}
            disabled={readOnly}
            maxLength={128}
            onChange={(event) =>
              patch({
                style: {
                  ...camera.style,
                  backgroundColor: event.currentTarget.value,
                },
              })
            }
          />
          <TextField
            label="边框颜色"
            value={camera.style?.borderColor ?? '#000000'}
            disabled={readOnly}
            maxLength={128}
            onChange={(event) =>
              patch({
                style: {
                  ...camera.style,
                  borderColor: event.currentTarget.value,
                },
              })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="边框宽度"
            value={camera.style?.borderWidth ?? 0}
            min={0}
            disabled={readOnly}
            onChange={(borderWidth) => patch({ style: { ...camera.style, borderWidth } })}
          />
          <NumberField
            label="不透明度"
            value={camera.style?.opacity ?? 1}
            min={0}
            max={1}
            step={0.05}
            disabled={readOnly}
            onChange={(opacity) => patch({ style: { ...camera.style, opacity } })}
          />
        </div>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e0ef] bg-white px-3 py-2 text-sm text-[#44424a]">
          <span>
            <span className="block font-medium">显示摄像头</span>
            <span className="block text-[11px] text-[#8a8790]">仅控制调试覆盖层</span>
          </span>
          <input
            type="checkbox"
            checked={camera.visible}
            disabled={readOnly}
            onChange={(event) => patch({ visible: event.currentTarget.checked })}
            className="size-4 accent-[#6547f5]"
          />
        </label>
      </div>

      {overflowParts.length > 0 ? (
        <p
          className="mt-3 flex gap-2 rounded-lg border border-[#f1dfb9] bg-[#fffaf0] p-2.5 text-xs leading-5 text-[#7b5d1c]"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          摄像头超出屏幕：{overflowParts.join('、')}。配置已保留，未自动截断。
        </p>
      ) : null}

      {onDone ? (
        <Button fullWidth className="mt-3" onClick={onDone}>
          <Check className="size-4" aria-hidden="true" /> 完成属性编辑
        </Button>
      ) : null}
    </div>
  );
}
