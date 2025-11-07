use tauri::Manager;
#[cfg(target_os = "windows")]
use tauri_plugin_decorum::WebviewWindowExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_upload::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_blinko::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    #[cfg(target_os = "windows")]
    {
        builder = builder.plugin(tauri_plugin_decorum::init());
    }

    builder
        .invoke_handler(tauri::generate_handler![greet])
        .setup(|app| {
            let main_window = app.get_webview_window("main").unwrap();

            // Set platform-specific window decorations
            #[cfg(target_os = "macos")]
            {
                // On macOS, use native decorations
                main_window.set_decorations(true).unwrap();
            }

            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                // On Windows and Linux, hide decorations
                main_window.set_decorations(false).unwrap();
            }

            // Apply Windows-specific titlebar
            #[cfg(target_os = "windows")]
            {
                main_window.create_overlay_titlebar().unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
