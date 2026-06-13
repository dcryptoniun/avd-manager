use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmulatorInstance {
    pub serial: String,
    pub name: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LaunchOptions {
    pub cold_boot: bool,
    pub wipe_data: bool,
    pub no_snapshot: bool,
    pub gpu: String,       // "auto", "host", "guest", "swiftshader_indirect"
    pub no_audio: bool,
    pub no_boot_anim: bool,
}

fn get_emulator_cmd(sdk_path: &str) -> String {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
    let p = std::path::PathBuf::from(sdk_path)
        .join("emulator")
        .join(format!("emulator{}", ext));
    if p.exists() {
        return p.to_string_lossy().to_string();
    }
    format!("emulator{}", ext)
}

fn get_adb_cmd(sdk_path: &str) -> String {
    let ext = if cfg!(target_os = "windows") { ".exe" } else { "" };
    let p = std::path::PathBuf::from(sdk_path)
        .join("platform-tools")
        .join(format!("adb{}", ext));
    if p.exists() {
        return p.to_string_lossy().to_string();
    }
    format!("adb{}", ext)
}

#[tauri::command]
pub fn launch_emulator(
    sdk_path: String,
    avd_name: String,
    options: LaunchOptions,
) -> Result<String, String> {
    let cmd = get_emulator_cmd(&sdk_path);

    let mut args: Vec<String> = vec!["-avd".to_string(), avd_name.clone()];

    if options.cold_boot {
        args.push("-no-snapshot-load".to_string());
    }
    if options.wipe_data {
        args.push("-wipe-data".to_string());
    }
    if options.no_snapshot {
        args.push("-no-snapshot".to_string());
    }
    if !options.gpu.is_empty() {
        args.push("-gpu".to_string());
        args.push(options.gpu);
    }
    if options.no_audio {
        args.push("-no-audio".to_string());
    }
    if options.no_boot_anim {
        args.push("-no-boot-anim".to_string());
    }

    // Launch emulator as a detached process
    let mut command = Command::new(&cmd);
    command
        .args(&args)
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path);

    // Detach on all platforms
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        const DETACHED_PROCESS: u32 = 0x00000008;
        command.creation_flags(CREATE_NO_WINDOW | DETACHED_PROCESS);
    }

    command.spawn()
        .map_err(|e| format!("Failed to launch emulator: {}", e))?;

    Ok(format!("Emulator '{}' launched", avd_name))
}

#[tauri::command]
pub fn list_running_emulators(sdk_path: String) -> Result<Vec<EmulatorInstance>, String> {
    let adb = get_adb_cmd(&sdk_path);

    let output = Command::new(&adb)
        .arg("devices")
        .output()
        .map_err(|e| format!("Failed to run adb: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut emulators: Vec<EmulatorInstance> = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("emulator-") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 {
                let serial = parts[0].to_string();
                let status = parts[1].to_string();

                // Try to get AVD name from the emulator
                let name = get_emulator_name(&adb, &serial).unwrap_or_else(|| serial.clone());

                emulators.push(EmulatorInstance {
                    serial,
                    name,
                    status,
                });
            }
        }
    }

    Ok(emulators)
}

fn get_emulator_name(adb_cmd: &str, serial: &str) -> Option<String> {
    let output = Command::new(adb_cmd)
        .args(["-s", serial, "emu", "avd", "name"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    stdout.lines().next().map(|s| s.trim().to_string())
}

#[tauri::command]
pub fn stop_emulator(sdk_path: String, serial: String) -> Result<String, String> {
    let adb = get_adb_cmd(&sdk_path);

    let output = Command::new(&adb)
        .args(["-s", &serial, "emu", "kill"])
        .output()
        .map_err(|e| format!("Failed to stop emulator: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Failed to stop emulator: {}", stderr));
    }

    Ok(format!("Emulator '{}' stopped", serial))
}
