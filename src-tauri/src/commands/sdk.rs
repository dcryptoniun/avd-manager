use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SdkPackage {
    pub path: String,
    pub version: String,
    pub description: String,
    pub status: String, // "installed", "available", "update"
    pub location: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemImage {
    pub path: String,
    pub api_level: String,
    pub variant: String, // google_apis, google_apis_playstore, default
    pub abi: String,     // x86_64, arm64-v8a, etc
    pub installed: bool,
}

fn get_sdkmanager_cmd(sdk_path: &str) -> String {
    let ext = if cfg!(target_os = "windows") { ".bat" } else { "" };
    let p = std::path::PathBuf::from(sdk_path)
        .join("cmdline-tools")
        .join("latest")
        .join("bin")
        .join(format!("sdkmanager{}", ext));
    if p.exists() {
        return p.to_string_lossy().to_string();
    }
    format!("sdkmanager{}", ext)
}

#[tauri::command]
pub fn list_sdk_packages(sdk_path: String) -> Result<Vec<SdkPackage>, String> {
    let cmd = get_sdkmanager_cmd(&sdk_path);

    let output = Command::new(&cmd)
        .arg("--list")
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path)
        .output()
        .map_err(|e| format!("Failed to run sdkmanager: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() && stdout.is_empty() {
        return Err(format!("sdkmanager failed: {}", stderr));
    }

    let mut packages: Vec<SdkPackage> = Vec::new();
    let mut section = String::new();

    for line in stdout.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with("Installed packages:") || trimmed.starts_with("installed packages:") {
            section = "installed".to_string();
            continue;
        } else if trimmed.starts_with("Available Packages:") || trimmed.starts_with("available packages:") {
            section = "available".to_string();
            continue;
        } else if trimmed.starts_with("Available Updates:") || trimmed.starts_with("available updates:") {
            section = "update".to_string();
            continue;
        }

        // Skip separator lines and headers
        if trimmed.is_empty()
            || trimmed.starts_with("---")
            || trimmed.starts_with("Path")
            || trimmed.starts_with("ID")
            || trimmed.starts_with("[")
            || trimmed.starts_with("done")
        {
            continue;
        }

        // Parse package lines: "path | version | description | location"
        let parts: Vec<&str> = trimmed.split('|').collect();
        if parts.len() >= 2 {
            let path = parts[0].trim().to_string();
            let version = parts[1].trim().to_string();
            let description = if parts.len() >= 3 {
                parts[2].trim().to_string()
            } else {
                path.clone()
            };
            let location = if parts.len() >= 4 {
                parts[3].trim().to_string()
            } else {
                String::new()
            };

            if !path.is_empty() && !path.contains("Loading") {
                packages.push(SdkPackage {
                    path,
                    version,
                    description,
                    status: section.clone(),
                    location,
                });
            }
        }
    }

    Ok(packages)
}

#[tauri::command]
pub fn list_system_images(sdk_path: String) -> Result<Vec<SystemImage>, String> {
    let packages = list_sdk_packages(sdk_path)?;

    let images: Vec<SystemImage> = packages
        .iter()
        .filter(|p| p.path.starts_with("system-images;"))
        .map(|p| {
            let parts: Vec<&str> = p.path.split(';').collect();
            let api_level = if parts.len() > 1 {
                parts[1].replace("android-", "")
            } else {
                String::from("Unknown")
            };
            let variant = if parts.len() > 2 {
                parts[2].to_string()
            } else {
                String::from("default")
            };
            let abi = if parts.len() > 3 {
                parts[3].to_string()
            } else {
                String::from("unknown")
            };

            SystemImage {
                path: p.path.clone(),
                api_level,
                variant,
                abi,
                installed: p.status == "installed",
            }
        })
        .collect();

    Ok(images)
}

#[tauri::command]
pub fn install_package(sdk_path: String, package: String) -> Result<String, String> {
    let cmd = get_sdkmanager_cmd(&sdk_path);

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("echo y | \"{}\" \"{}\"", cmd, package)])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("echo y | '{}' '{}'", cmd, package)])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    };

    let output = output.map_err(|e| format!("Failed to install package: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(format!("Installation failed: {} {}", stdout, stderr));
    }

    Ok(format!("Package '{}' installed successfully", package))
}

#[tauri::command]
pub fn uninstall_package(sdk_path: String, package: String) -> Result<String, String> {
    let cmd = get_sdkmanager_cmd(&sdk_path);

    let output = Command::new(&cmd)
        .arg("--uninstall")
        .arg(&package)
        .env("ANDROID_HOME", &sdk_path)
        .env("ANDROID_SDK_ROOT", &sdk_path)
        .output()
        .map_err(|e| format!("Failed to uninstall package: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Uninstall failed: {}", stderr));
    }

    Ok(format!("Package '{}' uninstalled", package))
}

#[tauri::command]
pub fn update_all_packages(sdk_path: String) -> Result<String, String> {
    let cmd = get_sdkmanager_cmd(&sdk_path);

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("echo y | \"{}\" --update", cmd)])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("echo y | '{}' --update", cmd)])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    };

    let output = output.map_err(|e| format!("Failed to update packages: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(format!("Update failed: {}", stderr));
    }

    Ok("All packages updated successfully".to_string())
}

#[tauri::command]
pub fn accept_licenses(sdk_path: String) -> Result<String, String> {
    let cmd = get_sdkmanager_cmd(&sdk_path);

    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &format!("echo y | \"{}\" --licenses", cmd)])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &format!("yes | '{}' --licenses", cmd)])
            .env("ANDROID_HOME", &sdk_path)
            .env("ANDROID_SDK_ROOT", &sdk_path)
            .output()
    };

    let output = output.map_err(|e| format!("Failed to accept licenses: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();

    Ok(format!("Licenses accepted. {}", stdout))
}
