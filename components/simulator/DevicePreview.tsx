import type { ReactNode, Ref } from 'react';
import type { DeviceOrientation, DeviceProfile } from '../../types/device';
import type { IframeStatus } from '../../types/simulator';
import { getDeviceViewport } from '../../utils/device-profile';
import { DeviceFrame } from './DeviceFrame';
import { DeviceScaleWrapper } from './DeviceScaleWrapper';

const NOOP = () => undefined;

export interface DevicePreviewProps {
  profile: DeviceProfile;
  orientation: DeviceOrientation;
  url: string;
  reloadKey: number;
  observedUrl?: string | null;
  iframeStatus: IframeStatus;
  iframeMessage?: string;
  scale?: number;
  safeAreaVisible: boolean;
  cameraVisible?: boolean;
  displayFeaturesVisible?: boolean;
  frameVisible?: boolean;
  showShadow?: boolean;
  iframeTitle?: string;
  iframeName?: string;
  iframeRef?: Ref<HTMLIFrameElement>;
  overlay?: ReactNode;
  selectedCameraId?: string | null;
  selectedFeatureId?: string | null;
  editable?: boolean;
  interactionBlocked?: boolean;
  onStatusChange: (status: IframeStatus, message?: string) => void;
  onReload: () => void;
  onSelectCamera?: (id: string) => void;
  onSelectFeature?: (id: string) => void;
  onMoveCamera?: (id: string, deltaX: number, deltaY: number) => void;
  onDeleteCamera?: (id: string) => void;
  onDraggingChange?: (dragging: boolean) => void;
  onClearSelection?: () => void;
}

export function DevicePreview({
  profile,
  orientation,
  url,
  reloadKey,
  observedUrl = null,
  iframeStatus,
  iframeMessage = '',
  scale = 1,
  safeAreaVisible,
  cameraVisible = true,
  displayFeaturesVisible = true,
  frameVisible = true,
  showShadow = true,
  iframeTitle = `${profile.name} 网页预览`,
  iframeName,
  iframeRef,
  overlay,
  selectedCameraId = null,
  selectedFeatureId = null,
  editable = false,
  interactionBlocked = false,
  onStatusChange,
  onReload,
  onSelectCamera = NOOP,
  onSelectFeature = NOOP,
  onMoveCamera = NOOP,
  onDeleteCamera = NOOP,
  onDraggingChange = NOOP,
  onClearSelection = NOOP,
}: DevicePreviewProps) {
  const viewport = getDeviceViewport(profile, orientation);
  const frameEnabled = frameVisible && profile.frame.enabled;
  const frameInsets = frameEnabled
    ? profile.frame.insets
    : { top: 0, right: 0, bottom: 0, left: 0 };
  const borderWidth = frameEnabled ? profile.frame.borderWidth : 0;
  const outerWidth = viewport.width + frameInsets.left + frameInsets.right + borderWidth * 2;
  const outerHeight = viewport.height + frameInsets.top + frameInsets.bottom + borderWidth * 2;

  return (
    <DeviceScaleWrapper width={outerWidth} height={outerHeight} scale={scale} overlay={overlay}>
      <DeviceFrame
        device={profile}
        viewport={viewport}
        url={url}
        reloadKey={reloadKey}
        observedUrl={observedUrl}
        iframeStatus={iframeStatus}
        iframeMessage={iframeMessage}
        scale={scale}
        showSafeArea={safeAreaVisible}
        showShadow={showShadow}
        frameVisible={frameVisible}
        cameraVisible={cameraVisible}
        displayFeaturesVisible={displayFeaturesVisible}
        iframeTitle={iframeTitle}
        selectedCameraId={selectedCameraId}
        selectedFeatureId={selectedFeatureId}
        editable={editable}
        dragging={interactionBlocked}
        onStatusChange={onStatusChange}
        onReload={onReload}
        onSelectCamera={onSelectCamera}
        onSelectFeature={onSelectFeature}
        onMoveCamera={onMoveCamera}
        onDeleteCamera={onDeleteCamera}
        onDraggingChange={onDraggingChange}
        onClearSelection={onClearSelection}
        {...(iframeName === undefined ? {} : { iframeName })}
        {...(iframeRef === undefined ? {} : { iframeRef })}
      />
    </DeviceScaleWrapper>
  );
}
