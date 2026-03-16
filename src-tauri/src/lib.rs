mod lib_loader;

use lib_loader::LoadedLibs;
use qiniu_upload_token::{credential::Credential, UploadPolicy};
use rosc::{OscMessage, OscPacket, OscType};
use std::net::UdpSocket;
use std::time::Duration;
use tauri::Manager;


/// 应用全局状态
struct AppState {
    /// 预加载的动态库
    loaded_libs: LoadedLibs,
    // 未来可以在这里添加其他状态成员
}

impl AppState {
    fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        Ok(AppState {
            loaded_libs: LoadedLibs::new(app_handle)?,
        })
    }
}

#[tauri::command]
fn dlltest(a: i32, b: i32, state: tauri::State<AppState>) -> Result<String, String> {
    // 直接使用预加载的函数句柄
    let result = unsafe { (state.loaded_libs.get_add_func())(a, b) };
    let check_vr_installed = unsafe { (state.loaded_libs.get_vr_is_installed_func())() };

    Ok(format!("{} + {} = {},{}", a, b, result,check_vr_installed))
  
}

#[tauri::command]
async fn send_to_vrc_chat(text: String) -> Result<(), String> {
    let sock = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let addr = "127.0.0.1:9000";

    let msg = OscMessage {
        addr: "/chatbox/input".to_string(),
        args: vec![OscType::String(text), OscType::Bool(true)],
    };

    let packet = OscPacket::Message(msg);
    let buf = rosc::encoder::encode(&packet).map_err(|e| e.to_string())?;

    sock.send_to(&buf, addr).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_qiniu_token(
    access_key: String,
    secret_key: String,
    bucket: String,
) -> Result<String, String> {
    let credential = Credential::new(&access_key, &secret_key);
    let upload_token = UploadPolicy::new_for_bucket(&bucket, Duration::from_secs(3600))
        .build_token(credential, Default::default());
    Ok(upload_token.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 应用启动时初始化全局状态
            let state = AppState::new(&app.app_handle())?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            dlltest,
            send_to_vrc_chat,
            get_qiniu_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
