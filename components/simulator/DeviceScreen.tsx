import type { DeviceViewportConfig } from '../../types/device';
import type { IframeStatus } from '../../types/simulator';
import type { Ref } from 'react';
import { CameraLayer } from './CameraLayer';
import { DisplayFeatureLayer } from './DisplayFeatureLayer';
import { SafeAreaOverlay } from './SafeAreaOverlay';
import { SimulatorIframe } from './SimulatorIframe';

interface DeviceScreenProps {
  viewport: DeviceViewportConfig;
  url: string;
  reloadKey: number;
  observedUrl?: string | null;
  iframeStatus: IframeStatus;
  iframeMessage: string;
  scale: number;
  showSafeArea: boolean;
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

export function DeviceScreen({
  viewport,
  url,
  reloadKey,
  observedUrl = null,
  iframeStatus,
  iframeMessage,
  scale,
  showSafeArea,
  cameraVisible = true,
  displayFeaturesVisible = true,
  iframeTitle,
  iframeName,
  iframeRef,
  selectedCameraId,
  selectedFeatureId,
  editable,
  dragging,
  onStatusChange,
  onReload,
  onSelectCamera,
  onSelectFeature,
  onMoveCamera,
  onDeleteCamera,
  onDraggingChange,
  onClearSelection,
}: DeviceScreenProps) {
  return (
    <div
      className="relative isolate overflow-hidden bg-white"
      style={{
        width: viewport.width,
        height: viewport.height,
        borderRadius: viewport.screenBorderRadius,
      }}
      onClick={onClearSelection}
    >
      <SimulatorIframe
        url={url}
        reloadKey={reloadKey}
        observedUrl={observedUrl}
        status={iframeStatus}
        message={iframeMessage}
        interactionBlocked={dragging}
        onStatusChange={onStatusChange}
        onReload={onReload}
        {...(iframeTitle === undefined ? {} : { title: iframeTitle })}
        {...(iframeName === undefined ? {} : { name: iframeName })}
        {...(iframeRef === undefined ? {} : { iframeRef })}
      />
      <SafeAreaOverlay
        insets={viewport.safeArea}
        width={viewport.width}
        height={viewport.height}
        visible={showSafeArea}
      />
      {cameraVisible ? (
        <CameraLayer
          viewport={viewport}
          scale={scale}
          selectedId={selectedCameraId}
          editable={editable}
          onSelect={onSelectCamera}
          onMove={onMoveCamera}
          onDelete={onDeleteCamera}
          onDraggingChange={onDraggingChange}
        />
      ) : null}
      {displayFeaturesVisible ? (
        <DisplayFeatureLayer
          viewport={viewport}
          selectedId={selectedFeatureId}
          editable={editable}
          onSelect={onSelectFeature}
        />
      ) : null}
    </div>
  );
}
