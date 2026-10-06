import * as Device from 'expo-device';
import { env } from '@/libs/env';
import type { DeviceInfo } from '@/services/auth/auth.dto';

// ============================================================================
// Device info for a device-bearer login (next-boilerplate DeviceInfoDTO).
// Stored on the session (UserSession.metadata.device) and shown in the
// account's "Active sessions" list. Every field is optional server-side and
// validated with .optional(), so unknown values are omitted, never null.
// ============================================================================

const TYPE_BY_EXPO: Partial<Record<Device.DeviceType, NonNullable<DeviceInfo['type']>>> = {
  [Device.DeviceType.PHONE]: 'phone',
  [Device.DeviceType.TABLET]: 'tablet',
  [Device.DeviceType.TV]: 'tv',
  [Device.DeviceType.DESKTOP]: 'desktop',
};

// Server-side max lengths (DeviceInfoDTO).
const MAX = { brand: 80, model: 80, name: 120, os: 40, osVersion: 40, appVersion: 40 } as const;

function clip(value: string | null | undefined, max: number): string | undefined {
  const v = value?.trim();
  return v ? v.slice(0, max) : undefined;
}

export function getDeviceInfo(): DeviceInfo {
  const info: DeviceInfo = {
    type: Device.deviceType != null ? (TYPE_BY_EXPO[Device.deviceType] ?? 'other') : undefined,
    brand: clip(Device.brand, MAX.brand),
    model: clip(Device.modelName, MAX.model),
    name: clip(Device.deviceName, MAX.name),
    os: clip(Device.osName, MAX.os),
    osVersion: clip(Device.osVersion, MAX.osVersion),
    appVersion: clip(env.EXPO_PUBLIC_APP_VERSION, MAX.appVersion),
  };
  // Drop undefined keys: the DTO accepts a missing field, not null.
  return Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined)) as DeviceInfo;
}
