import { useState, type ChangeEvent } from 'react';
import {
  createCameraFromTemplate,
  createHomeIndicator,
  type CameraTemplateId,
} from '../../services/device-service';
import type { DeviceOrientation, DeviceViewportConfig, SafeAreaInsets } from '../../types/device';
import { TextField } from '../common/FormField';
import { CameraListEditor } from './CameraListEditor';
import { DisplayFeatureEditor } from './DisplayFeatureEditor';

interface DeviceViewportFormProps {
  orientation: DeviceOrientation;
  value: DeviceViewportConfig;
  errors: Readonly<Record<string, string>>;
  onChange: (value: DeviceViewportConfig) => void;
}

function errorProps(errors: Readonly<Record<string, string>>, path: string) {
  const error = errors[path];
  return error === undefined ? {} : { error };
}

export function DeviceViewportForm({
  orientation,
  value,
  errors,
  onChange,
}: DeviceViewportFormProps) {
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const prefix = `$.${orientation}`;
  const orientationLabel = orientation === 'portrait' ? '竖屏' : '横屏';

  const updateNumber =
    (key: 'width' | 'height' | 'screenBorderRadius') => (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.valueAsNumber;
      if (!Number.isFinite(next)) return;
      onChange({ ...value, [key]: next });
    };

  const updateSafeArea = (key: keyof SafeAreaInsets) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.valueAsNumber;
    if (!Number.isFinite(next)) return;
    onChange({
      ...value,
      safeArea: { ...value.safeArea, [key]: next },
    });
  };

  const addCamera = (template: CameraTemplateId) => {
    const camera = createCameraFromTemplate(template);
    onChange({ ...value, cameras: [...value.cameras, camera] });
    setSelectedCameraId(camera.id);
    setSelectedFeatureId(null);
  };

  const addHomeIndicator = () => {
    const feature = createHomeIndicator(value.width, value.height);
    onChange({
      ...value,
      displayFeatures: [...value.displayFeatures, feature],
    });
    setSelectedFeatureId(feature.id);
    setSelectedCameraId(null);
  };

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-[#e7e7ec] bg-[#fafafd] p-4">
        <h3 className="text-sm font-semibold text-[#2f3037]">{orientationLabel}视口配置</h3>
        <p className="mt-1 text-xs leading-5 text-[#7c7e87]">
          {orientationLabel}拥有独立尺寸、安全区、摄像头和显示特征，不会由另一方向自动交换生成。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <TextField
          label="CSS 宽度"
          hint="px"
          type="number"
          min={1}
          step="any"
          value={value.width}
          required
          {...errorProps(errors, `${prefix}.width`)}
          onChange={updateNumber('width')}
        />
        <TextField
          label="CSS 高度"
          hint="px"
          type="number"
          min={1}
          step="any"
          value={value.height}
          required
          {...errorProps(errors, `${prefix}.height`)}
          onChange={updateNumber('height')}
        />
        <TextField
          label="屏幕圆角"
          hint="px"
          type="number"
          min={0}
          step="any"
          value={value.screenBorderRadius}
          {...errorProps(errors, `${prefix}.screenBorderRadius`)}
          onChange={updateNumber('screenBorderRadius')}
        />
      </div>

      <fieldset className="rounded-xl border border-[#e7e7ec] p-4">
        <legend className="px-1 text-sm font-semibold text-[#34353c]">安全区（CSS px）</legend>
        <p className="mb-3 text-xs text-[#858790]">
          安全区只用于覆盖层，不会给目标网页自动添加 padding。
        </p>
        <div className="grid grid-cols-4 gap-3">
          {(
            [
              ['top', '上'],
              ['right', '右'],
              ['bottom', '下'],
              ['left', '左'],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              type="number"
              min={0}
              step="any"
              value={value.safeArea[key]}
              {...errorProps(errors, `${prefix}.safeArea.${key}`)}
              onChange={updateSafeArea(key)}
            />
          ))}
        </div>
      </fieldset>

      <div className="overflow-hidden rounded-xl border border-[#e7e7ec]">
        <CameraListEditor
          cameras={value.cameras}
          viewport={value}
          selectedCameraId={selectedCameraId}
          onSelectCamera={(id) => {
            setSelectedCameraId(id);
            if (id) setSelectedFeatureId(null);
          }}
          onAddTemplate={addCamera}
          onChangeCamera={(camera) =>
            onChange({
              ...value,
              cameras: value.cameras.map((item) => (item.id === camera.id ? camera : item)),
            })
          }
          onDeleteCamera={(id) => {
            onChange({
              ...value,
              cameras: value.cameras.filter((camera) => camera.id !== id),
            });
            if (selectedCameraId === id) setSelectedCameraId(null);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e7e7ec]">
        <DisplayFeatureEditor
          features={value.displayFeatures}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={(id) => {
            setSelectedFeatureId(id);
            if (id) setSelectedCameraId(null);
          }}
          onAddHomeIndicator={addHomeIndicator}
          onChangeFeature={(feature) =>
            onChange({
              ...value,
              displayFeatures: value.displayFeatures.map((item) =>
                item.id === feature.id ? feature : item,
              ),
            })
          }
          onDeleteFeature={(id) => {
            onChange({
              ...value,
              displayFeatures: value.displayFeatures.filter((feature) => feature.id !== id),
            });
            if (selectedFeatureId === id) setSelectedFeatureId(null);
          }}
        />
      </div>
    </div>
  );
}
