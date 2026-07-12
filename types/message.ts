import type { DeviceOrientation, DeviceProfile, SafeAreaInsets } from './device';

export type ExtensionMessage =
  | {
      type: 'OPEN_SIMULATOR';
      payload: {
        url?: string;
        deviceId?: string;
      };
    }
  | {
      type: 'SET_DEVICE_CONTEXT';
      payload: {
        device: DeviceProfile;
        orientation: DeviceOrientation;
      };
    }
  | {
      type: 'SET_SAFE_AREA';
      payload: SafeAreaInsets;
    }
  | {
      type: 'PING';
    }
  | {
      type: 'PONG';
    };

export type ExtensionMessageType = ExtensionMessage['type'];

export interface ExtensionMessageError {
  code: string;
  message: string;
}

export type ExtensionMessageResponse<T = undefined> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ExtensionMessageError;
    };
