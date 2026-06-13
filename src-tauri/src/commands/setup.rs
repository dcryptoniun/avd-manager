use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use crate::commands::utils::create_command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvironmentStatus {
    pub sdk_path: Option<String>,
    pub java_home: Option<String>,
    pub java_version: Option<String>,
    pub avdmanager_path: Option<String>,
    pub sdkmanager_path: Option<String>,
    pub emulator_path: Option<String>,
    pub adb_path: Option<String>,
    pub is_sdk_valid: bool,
    pub is_java_valid: bool,
}

fn find_sdk_path() -> Option<String> {
    // Check environment variables
    if let Ok(path) = env::var("ANDROID_HOME") {
        if PathBuf::from(&path).exists() {
            return Some(path);
        }
    }
    if let Ok(path) = env::var("ANDROID_SDK_ROOT") {
        if PathBuf::from(&path).exists() {
            return Some(path);
        }
    }

    // Check common installation paths
    let home_dir: Option<PathBuf> = dirs_fallback();

    if let Some(home) = home_dir {
        let common_paths: Vec<PathBuf> = if cfg!(target_os = "windows") {
            vec![
                home.join("AppData")
                    .join("Local")
                    .join("Android")
                    .join("Sdk"),
                PathBuf::from("C:\\Android\\sdk"),
                PathBuf::from("C:\\android\\sdk"),
                home.join("Android").join("Sdk"),
            ]
        } else if cfg!(target_os = "macos") {
            vec![
                home.join("Library").join("Android").join("sdk"),
                home.join("Android").join("Sdk"),
            ]
        } else {
            vec![
                home.join("Android").join("Sdk"),
                home.join("android").join("sdk"),
                PathBuf::from("/opt/android-sdk"),
            ]
        };

        for path in common_paths {
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
        }
    }

    None
}

fn dirs_fallback() -> Option<PathBuf> {
    if cfg!(target_os = "windows") {
        env::var("USERPROFILE").ok().map(PathBuf::from)
    } else {
        env::var("HOME").ok().map(PathBuf::from)
    }
}

fn find_tool_in_sdk(sdk_path: &str, tool_name: &str) -> Option<String> {
    let sdk = PathBuf::from(sdk_path);
    let ext = if cfg!(target_os = "windows") {
        ".bat"
    } else {
        ""
    };

    // Check cmdline-tools paths (latest first)
    let cmdline_paths = vec![
        sdk.join("cmdline-tools")
            .join("latest")
            .join("bin")
            .join(format!("{}{}", tool_name, ext)),
        sdk.join("cmdline-tools")
            .join("bin")
            .join(format!("{}{}", tool_name, ext)),
    ];

    for path in cmdline_paths {
        if path.exists() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    // Check tools directory (legacy)
    let legacy = sdk
        .join("tools")
        .join("bin")
        .join(format!("{}{}", tool_name, ext));
    if legacy.exists() {
        return Some(legacy.to_string_lossy().to_string());
    }

    // For emulator, check emulator directory
    if tool_name == "emulator" {
        let emu_ext = if cfg!(target_os = "windows") {
            ".exe"
        } else {
            ""
        };
        let emu_path = sdk
            .join("emulator")
            .join(format!("{}{}", tool_name, emu_ext));
        if emu_path.exists() {
            return Some(emu_path.to_string_lossy().to_string());
        }
    }

    // For adb, check platform-tools
    if tool_name == "adb" {
        let adb_ext = if cfg!(target_os = "windows") {
            ".exe"
        } else {
            ""
        };
        let adb_path = sdk
            .join("platform-tools")
            .join(format!("{}{}", tool_name, adb_ext));
        if adb_path.exists() {
            return Some(adb_path.to_string_lossy().to_string());
        }
    }

    None
}

fn detect_java() -> (Option<String>, Option<String>) {
    let java_home = env::var("JAVA_HOME").ok();

    let java_version = create_command("java")
        .arg("-version")
        .output()
        .ok()
        .and_then(|output| {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let text = if stderr.contains("version") {
                stderr
            } else {
                stdout
            };
            text.lines().next().map(|line| line.trim().to_string())
        });

    (java_home, java_version)
}

#[tauri::command]
pub fn detect_environment() -> EnvironmentStatus {
    let sdk_path = find_sdk_path();
    let (java_home, java_version) = detect_java();

    let (avdmanager_path, sdkmanager_path, emulator_path, adb_path) =
        if let Some(ref sdk) = sdk_path {
            (
                find_tool_in_sdk(sdk, "avdmanager"),
                find_tool_in_sdk(sdk, "sdkmanager"),
                find_tool_in_sdk(sdk, "emulator"),
                find_tool_in_sdk(sdk, "adb"),
            )
        } else {
            (None, None, None, None)
        };

    let is_sdk_valid = sdk_path.is_some()
        && avdmanager_path.is_some()
        && sdkmanager_path.is_some()
        && emulator_path.is_some();

    let is_java_valid = java_version.is_some();

    EnvironmentStatus {
        sdk_path,
        java_home,
        java_version,
        avdmanager_path,
        sdkmanager_path,
        emulator_path,
        adb_path,
        is_sdk_valid,
        is_java_valid,
    }
}

#[tauri::command]
pub fn get_sdk_path() -> Option<String> {
    find_sdk_path()
}

#[tauri::command]
pub fn set_sdk_path(path: String) -> Result<bool, String> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err("Path does not exist".to_string());
    }
    // Set environment variable for the current process
    env::set_var("ANDROID_HOME", &path);
    env::set_var("ANDROID_SDK_ROOT", &path);
    Ok(true)
}

#[tauri::command]
pub fn validate_sdk_tools(sdk_path: String) -> Result<Vec<String>, String> {
    let mut missing: Vec<String> = Vec::new();

    if find_tool_in_sdk(&sdk_path, "avdmanager").is_none() {
        missing.push("avdmanager".to_string());
    }
    if find_tool_in_sdk(&sdk_path, "sdkmanager").is_none() {
        missing.push("sdkmanager".to_string());
    }
    if find_tool_in_sdk(&sdk_path, "emulator").is_none() {
        missing.push("emulator".to_string());
    }
    if find_tool_in_sdk(&sdk_path, "adb").is_none() {
        missing.push("adb".to_string());
    }

    Ok(missing)
}
