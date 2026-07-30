import type { Ref } from 'react';
import type { DeviceFrameInsets, DeviceProfile, DeviceViewportConfig } from '../../types/device';
import type { IframeStatus } from '../../types/simulator';
import { DeviceScreen } from './DeviceScreen';

interface DeviceFrameProps {
  device: DeviceProfile;
  viewport: DeviceViewportConfig;
  frameInsets: DeviceFrameInsets;
  url: string;
  reloadKey: number;
  observedUrl?: string | null;
  iframeStatus: IframeStatus;
  iframeMessage: string;
  scale: number;
  showSafeArea: boolean;
  showShadow: boolean;
  frameVisible?: boolean;
  cameraVisible?: boolean;
  displayFeaturesVisible?: boolean;
  iframeTitle?: string;
  iframeName?: string;
  iframeRef?: Ref<HTMLIFrameElement>;
  selectedCameraId: string | null;
  selectedFeatureId: string | null;
  editable: boolean;
  dragging: boolean;
  onStatusChange: (status: IframeStatus, message?: string) => void;
  onReload: () => void;
  onSelectCamera: (id: string) => void;
  onSelectFeature: (id: string) => void;
  onMoveCamera: (id: string, deltaX: number, deltaY: number) => void;
  onDeleteCamera: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
  onClearSelection: () => void;
}

export function DeviceFrame({
  device,
  viewport,
  frameInsets,
  showShadow,
  frameVisible = true,
  ...props
}: DeviceFrameProps) {
  const { frame } = device;
  const frameEnabled = frameVisible && frame.enabled;
  const frameStyle = frameEnabled
    ? {
        paddingTop: frameInsets.top,
        paddingRight: frameInsets.right,
        paddingBottom: frameInsets.bottom,
        paddingLeft: frameInsets.left,
        borderRadius: frame.borderRadius,
        backgroundColor: frame.backgroundColor,
        borderColor: frame.borderColor,
        borderWidth: frame.borderWidth,
        borderStyle: 'solid',
        boxShadow: showShadow && frame.shadowEnabled ? frame.shadow : 'none',
      }
    : { borderRadius: viewport.screenBorderRadius, boxShadow: 'none' };

  return (
    <div className="relative" style={frameStyle} data-device-capture-target="true">
      {frameEnabled && device.category !== 'desktop' ? (
        <>
          <span className="absolute top-[18%] -left-[4px] h-[58px] w-[3px] rounded-l bg-[#46464b] shadow-sm" />
          <span className="absolute top-[31%] -left-[4px] h-[82px] w-[3px] rounded-l bg-[#46464b] shadow-sm" />
          <span className="absolute top-[24%] -right-[4px] h-[92px] w-[3px] rounded-r bg-[#46464b] shadow-sm" />
        </>
      ) : null}
      <DeviceScreen viewport={viewport} {...props} />
    </div>
  );
}
