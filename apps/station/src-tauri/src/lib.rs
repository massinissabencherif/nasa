#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // The station UI is a plain web app talking to the local FastAPI server
    // over HTTP; no custom Rust commands are needed.
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
