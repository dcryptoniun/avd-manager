// ==========================================
// AVD Manager — TypeScript Type Definitions
// ==========================================

export interface EnvironmentStatus {
  sdk_path: string | null;
  java_home: string | null;
  java_version: string | null;
  avdmanager_path: string | null;
  sdkmanager_path: string | null;
  emulator_path: string | null;
  adb_path: string | null;
  is_sdk_valid: boolean;
  is_java_valid: boolean;
}

export interface AvdInfo {
  name: string;
  device: string;
  path: string;
  target: string;
  api_level: string;
  abi: string;
  skin: string;
  sdcard: string;
}

export interface DeviceDefinition {
  id: string;
  name: string;
  oem: string;
  tag: string;
}

export interface SdkPackage {
  path: string;
  version: string;
  description: string;
  status: string;
  location: string;
}

export interface SystemImage {
  path: string;
  api_level: string;
  variant: string;
  abi: string;
  installed: boolean;
}

export interface EmulatorInstance {
  serial: string;
  name: string;
  status: string;
}

export interface LaunchOptions {
  cold_boot: boolean;
  wipe_data: boolean;
  no_snapshot: boolean;
  gpu: string;
  no_audio: boolean;
  no_boot_anim: boolean;
}

export type Theme = 'light' | 'dark' | 'system';

export type NavPage = 'devices' | 'platforms' | 'tools' | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
