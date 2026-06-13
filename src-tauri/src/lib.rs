pub mod commands;

use commands::{avd, emulator, sdk, setup};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Setup commands
            setup::detect_environment,
            setup::get_sdk_path,
            setup::set_sdk_path,
            setup::validate_sdk_tools,
            // AVD commands
            avd::list_avds,
            avd::create_avd,
            avd::delete_avd,
            avd::rename_avd,
            avd::wipe_avd_data,
            avd::get_avd_details,
            avd::list_device_definitions,
            // SDK commands
            sdk::list_sdk_packages,
            sdk::list_system_images,
            sdk::install_package,
            sdk::uninstall_package,
            sdk::update_all_packages,
            sdk::accept_licenses,
            // Emulator commands
            emulator::launch_emulator,
            emulator::list_running_emulators,
            emulator::stop_emulator,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
