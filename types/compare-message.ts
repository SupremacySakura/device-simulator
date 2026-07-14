export interface CompareBridgeIdentity {
  sessionId: string;
  instanceId: string;
  bridgeToken: string;
}

export interface CompareScrollProgress {
  verticalProgress: number;
  horizontalProgress: number;
}

export interface CompareSyncCapability {
  scroll: boolean;
  navigation: boolean;
  reason?: 'bridge-ready' | 'bridge-disconnected' | 'bridge-timeout' | 'unsupported-url';
}

type CompareMessage<TType extends string, TPayload> = {
  source: 'device-simulator-compare';
  type: TType;
  payload: CompareBridgeIdentity & TPayload;
};

export type CompareRuntimeMessage =
  | CompareMessage<'COMPARE_REGISTER_INSTANCE', Record<never, never>>
  | CompareMessage<'COMPARE_UNREGISTER_INSTANCE', Record<never, never>>
  | CompareMessage<
      'COMPARE_FRAME_READY',
      {
        url: string;
        capability: CompareSyncCapability;
      }
    >
  | CompareMessage<
      'COMPARE_INSTANCE_CAPABILITY',
      {
        capability: CompareSyncCapability;
      }
    >
  | CompareMessage<
      'COMPARE_SCROLL_EVENT',
      CompareScrollProgress & {
        syncToken: string;
      }
    >
  | CompareMessage<
      'COMPARE_APPLY_SCROLL',
      CompareScrollProgress & {
        syncToken: string;
      }
    >
  | CompareMessage<
      'COMPARE_NAVIGATION_EVENT',
      {
        url: string;
      }
    >
  | CompareMessage<
      'COMPARE_APPLY_NAVIGATION',
      {
        url: string;
      }
    >;

export type CompareRuntimeEvent =
  | {
      type: 'capability';
      instanceId: string;
      capability: CompareSyncCapability;
    }
  | ({
      type: 'scroll';
      instanceId: string;
      syncToken: string;
    } & CompareScrollProgress)
  | {
      type: 'navigation';
      instanceId: string;
      url: string;
    };
