import { invoke, Channel } from '@tauri-apps/api/core';
import type {
  EnvironmentStatus,
  AvdInfo,
  DeviceDefinition,
  SdkPackage,
  SystemImage,
  EmulatorInstance,
  LaunchOptions,
} from './types';

// ==========================================
// Setup Commands
// ==========================================

export async function detectEnvironment(): Promise<EnvironmentStatus> {
  return invoke<EnvironmentStatus>('detect_environment');
}

export async function getSdkPath(): Promise<string | null> {
  return invoke<string | null>('get_sdk_path');
}

export async function setSdkPath(path: string): Promise<boolean> {
  return invoke<boolean>('set_sdk_path', { path });
}

export async function validateSdkTools(sdkPath: string): Promise<string[]> {
  return invoke<string[]>('validate_sdk_tools', { sdkPath });
}

// ==========================================
// AVD Commands
// ==========================================

export async function listAvds(sdkPath: string): Promise<AvdInfo[]> {
  return invoke<AvdInfo[]>('list_avds', { sdkPath });
}

export async function createAvd(
  sdkPath: string,
  name: string,
  packageStr: string,
  device: string
): Promise<string> {
  return invoke<string>('create_avd', {
    sdkPath,
    name,
    package: packageStr,
    device,
  });
}

export async function deleteAvd(sdkPath: string, name: string): Promise<string> {
  return invoke<string>('delete_avd', { sdkPath, name });
}

export async function renameAvd(
  sdkPath: string,
  oldName: string,
  newName: string
): Promise<string> {
  return invoke<string>('rename_avd', { sdkPath, oldName, newName });
}

export async function wipeAvdData(sdkPath: string, name: string): Promise<string> {
  return invoke<string>('wipe_avd_data', { sdkPath, name });
}

export async function getAvdDetails(
  name: string
): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_avd_details', { name });
}

export async function listDeviceDefinitions(
  sdkPath: string
): Promise<DeviceDefinition[]> {
  return invoke<DeviceDefinition[]>('list_device_definitions', { sdkPath });
}

// ==========================================
// SDK Commands
// ==========================================

export async function listSdkPackages(sdkPath: string): Promise<SdkPackage[]> {
  return invoke<SdkPackage[]>('list_sdk_packages', { sdkPath });
}

export async function listSystemImages(sdkPath: string): Promise<SystemImage[]> {
  return invoke<SystemImage[]>('list_system_images', { sdkPath });
}

export async function installPackage(
  sdkPath: string,
  packageStr: string
): Promise<string> {
  return invoke<string>('install_package', { sdkPath, package: packageStr });
}

export async function uninstallPackage(
  sdkPath: string,
  packageStr: string
): Promise<string> {
  return invoke<string>('uninstall_package', { sdkPath, package: packageStr });
}

export async function updateAllPackages(sdkPath: string): Promise<string> {
  return invoke<string>('update_all_packages', { sdkPath });
}

export async function acceptLicenses(sdkPath: string): Promise<string> {
  return invoke<string>('accept_licenses', { sdkPath });
}

// ==========================================
// Emulator Commands
// ==========================================

export async function launchEmulator(
  sdkPath: string,
  avdName: string,
  options: LaunchOptions,
  onLog?: (line: string) => void
): Promise<string> {
  const onEvent = new Channel<string>();
  onEvent.onmessage = (message: string) => {
    if (onLog) {
      onLog(message);
    }
  };

  return invoke<string>('launch_emulator', {
    sdkPath,
    avdName,
    options,
    onEvent,
  });
}

export async function listRunningEmulators(
  sdkPath: string
): Promise<EmulatorInstance[]> {
  return invoke<EmulatorInstance[]>('list_running_emulators', { sdkPath });
}

export async function stopEmulator(
  sdkPath: string,
  serial: string
): Promise<string> {
  return invoke<string>('stop_emulator', { sdkPath, serial });
}
