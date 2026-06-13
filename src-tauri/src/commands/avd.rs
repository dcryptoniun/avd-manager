use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AvdInfo {
    pub name: String,
    pub device: String,
    pub path: String,
    pub target: String,
    pub api_level: String,
    pub abi: String,
    pub skin: String,
    pub sdcard: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceDefinition {
    pub id: String,
    pub name: String,
    pub oem: String,
    pub tag: String,
}

fn get_avdmanager_cmd(sdk_path: &str) -> String {
    let ext = if cfg!(target_os = "windows") { ".bat" } else { "" };
    let p = std::path::PathBuf::from(sdk_path)
        .join("cmdline-tools")
        .join("latest")
        .join("bin")
        .join(format!("avdmanager{}", ext));
    if p.exists() {
        return p.to_string_lossy().to_string();
    }
    // Fallback
    format!("avdmanager{}", ext)
}

fn parse_avd_list(output: &str) -> Vec<AvdInfo> {
    let mut avds: Vec<AvdInfo> = Vec::new();
    let mut current_name = String::new();
    let mut current_device = String::new();
    let mut current_path = String::new();
    let mut current_target = String::new();
    let mut current_abi = String::new();
    let mut current_skin = String::new();
    let mut current_sdcard = String::new();
    let mut in_avd = false;

    for line in output.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("Name:") {
            if in_avd && !current_name.is_empty() {
                let api = extract_api_level(&current_target);
                avds.push(AvdInfo {
                    name: current_name.clone(),
                    device: current_device.clone(),
                    path: current_path.clone(),
                    target: current_target.clone(),
                    api_level: api,
                    abi: current_abi.clone(),
                    skin: current_skin.clone(),
                    sdcard: current_sdcard.clone(),
                });
            }
            current_name = trimmed.trim_start_matches("Name:").trim().to_string();
            current_device = String::new();
            current_path = String::new();
            current_target = String::new();
            current_abi = String::new();
            current_skin = String::new();
            current_sdcard = String::new();
            in_avd = true;
        } else if trimmed.starts_with("Device:") {
            current_device = trimmed.trim_start_matches("Device:").trim().to_string();
        } else if trimmed.starts_with("Path:") {
            current_path = trimmed.trim_start_matches("Path:").trim().to_string();
        } else if trimmed.starts_with("Target:") {
            current_target = trimmed.trim_start_matches("Target:").trim().to_string();
        } else if trimmed.starts_with("Based on:") {
            if current_target.is_empty() {
                current_target = trimmed.trim_start_matches("Based on:").trim().to_string();
            }
        } else if trimmed.starts_with("Tag/ABI:") {
            current_abi = trimmed.trim_start_matches("Tag/ABI:").trim().to_string();
        } else if trimmed.starts_with("Skin:") {
            current_skin = trimmed.trim_start_matches("Skin:").trim().to_string();
        } else if trimmed.starts_with("Sdcard:") {
            current_sdcard = trimmed.trim_start_matches("Sdcard:").trim().to_string();
        }
    }

    // Push last AVD
    if in_avd && !current_name.is_empty() {
        let api = extract_api_level(&current_target);
        avds.push(AvdInfo {
            name: current_name,
            device: current_device,
            path: current_path,
            target: current_target,
            api_level: api,
            abi: current_abi,
            skin: current_skin,
            sdcard: current_sdcard,
        });
    }

    avds
}

fn extract_api_level(target: &str) -> String {
    // Try to extract API level from strings like "Android 14.0 (API level 34)"
    if let Some(pos) = target.find("API level") {
        let rest = &target[pos + 10..];
        let level: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        if !level.is_empty() {
            return level;
        }
    }
    // Try "android-34" format
    if let Some(pos) = target.find("android-") {
        let rest = &target[pos + 8..];
        let level: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
        if !level.is_empty() {
            return level;
        }
    }
    String::from("Unknown")
}

#[tauri::command]
pub fn list_avds(sdk_path: String) -> Result<Vec<AvdInfo>, String> {
    let cmd = get_avdmanager_cmd(&sdk_path);

    let output = Command::new(&cmd)
        .arg("list")
        .arg("avd")
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path)
        .output()
        .map_err(|e| format!("Failed to run avdmanager: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() && stdout.is_empty() {
        return Err(format!("avdmanager failed: {}", stderr));
    }

    Ok(parse_avd_list(&stdout))
}

#[tauri::command]
pub fn create_avd(
    sdk_path: String,
    name: String,
    package: String,
    device: String,
) -> Result<String, String> {
    let cmd = get_avdmanager_cmd(&sdk_path);

    let mut command = Command::new(&cmd);
    command
        .arg("create")
        .arg("avd")
        .arg("-n")
        .arg(&name)
        .arg("-k")
        .arg(&package)
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path);

    if !device.is_empty() {
        command.arg("-d").arg(&device);
    }

    // Auto-decline custom hardware profile
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("echo no | \"{}\" create avd -n \"{}\" -k \"{}\" {} ",
                cmd, name, package,
                if device.is_empty() { String::new() } else { format!("-d \"{}\"", device) }
            )])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("echo no | '{}' create avd -n '{}' -k '{}' {} ",
                cmd, name, package,
                if device.is_empty() { String::new() } else { format!("-d '{}'", device) }
            )])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    };

    let output = output.map_err(|e| format!("Failed to create AVD: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!("Failed to create AVD: {} {}", stdout, stderr));
    }

    Ok(format!("AVD '{}' created successfully", name))
}

#[tauri::command]
pub fn delete_avd(sdk_path: String, name: String) -> Result<String, String> {
    let cmd = get_avdmanager_cmd(&sdk_path);

    let output = Command::new(&cmd)
        .arg("delete")
        .arg("avd")
        .arg("-n")
        .arg(&name)
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path)
        .output()
        .map_err(|e| format!("Failed to delete AVD: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Failed to delete AVD: {}", stderr));
    }

    Ok(format!("AVD '{}' deleted", name))
}

#[tauri::command]
pub fn rename_avd(sdk_path: String, old_name: String, new_name: String) -> Result<String, String> {
    let cmd = get_avdmanager_cmd(&sdk_path);

    let output = Command::new(&cmd)
        .arg("move")
        .arg("avd")
        .arg("-n")
        .arg(&old_name)
        .arg("-r")
        .arg(&new_name)
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path)
        .output()
        .map_err(|e| format!("Failed to rename AVD: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Failed to rename AVD: {}", stderr));
    }

    Ok(format!("AVD renamed from '{}' to '{}'", old_name, new_name))
}

#[tauri::command]
pub fn wipe_avd_data(_sdk_path: String, name: String) -> Result<String, String> {
    // Wipe data by finding the AVD directory and removing userdata files
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };

    let avd_dir = std::path::PathBuf::from(&home)
        .join(".android")
        .join("avd")
        .join(format!("{}.avd", name));

    if !avd_dir.exists() {
        return Err(format!("AVD directory not found: {:?}", avd_dir));
    }

    // Remove userdata files
    let userdata_files = ["userdata-qemu.img", "userdata-qemu.img.qcow2", "cache.img"];
    for file in &userdata_files {
        let path = avd_dir.join(file);
        if path.exists() {
            let _ = std::fs::remove_file(&path);
        }
    }

    // Remove snapshots directory
    let snapshots = avd_dir.join("snapshots");
    if snapshots.exists() {
        let _ = std::fs::remove_dir_all(&snapshots);
    }

    Ok(format!("Data wiped for AVD '{}'", name))
}

#[tauri::command]
pub fn get_avd_details(name: String) -> Result<std::collections::HashMap<String, String>, String> {
    let home = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE").unwrap_or_default()
    } else {
        std::env::var("HOME").unwrap_or_default()
    };

    let config_path = std::path::PathBuf::from(&home)
        .join(".android")
        .join("avd")
        .join(format!("{}.avd", name))
        .join("config.ini");

    if !config_path.exists() {
        return Err(format!("Config file not found for AVD '{}'", name));
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;

    let mut details = std::collections::HashMap::new();
    for line in content.lines() {
        if let Some((key, value)) = line.split_once('=') {
            details.insert(key.trim().to_string(), value.trim().to_string());
        }
    }

    Ok(details)
}

#[tauri::command]
pub fn list_device_definitions(sdk_path: String) -> Result<Vec<DeviceDefinition>, String> {
    let cmd = get_avdmanager_cmd(&sdk_path);

    let output = Command::new(&cmd)
        .arg("list")
        .arg("device")
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path)
        .output()
        .map_err(|e| format!("Failed to list devices: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    let mut devices: Vec<DeviceDefinition> = Vec::new();
    let mut current_id = String::new();
    let mut current_name = String::new();
    let mut current_oem = String::new();
    let mut current_tag = String::new();
    let mut in_device = false;

    for line in stdout.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("id:") {
            if in_device && !current_id.is_empty() {
                devices.push(DeviceDefinition {
                    id: current_id.clone(),
                    name: current_name.clone(),
                    oem: current_oem.clone(),
                    tag: current_tag.clone(),
                });
            }
            // Parse id field: 'id: 0 or "pixel"'
            let parts: Vec<&str> = trimmed.split("or").collect();
            if parts.len() > 1 {
                current_id = parts[1].trim().trim_matches('"').to_string();
            } else {
                current_id = trimmed.trim_start_matches("id:").trim().to_string();
            }
            current_name = String::new();
            current_oem = String::new();
            current_tag = String::new();
            in_device = true;
        } else if trimmed.starts_with("Name:") {
            current_name = trimmed.trim_start_matches("Name:").trim().to_string();
        } else if trimmed.starts_with("OEM") || trimmed.starts_with("OEM:") {
            current_oem = trimmed
                .trim_start_matches("OEM")
                .trim_start_matches(':')
                .trim()
                .to_string();
        } else if trimmed.starts_with("Tag") {
            current_tag = trimmed
                .trim_start_matches("Tag")
                .trim_start_matches(':')
                .trim()
                .to_string();
        }
    }

    // Push last device
    if in_device && !current_id.is_empty() {
        devices.push(DeviceDefinition {
            id: current_id,
            name: current_name,
            oem: current_oem,
            tag: current_tag,
        });
    }

    Ok(devices)
}
