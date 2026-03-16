use libloading::Library;
use libloading::Symbol;
use qiniu_upload_token::{credential::Credential, UploadPolicy};
use rosc::{OscMessage, OscPacket, OscType};
use std::net::UdpSocket;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::Manager;

type AddFunc = unsafe extern "C" fn(i32, i32) -> i32;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// fn dynamic_load(lib_path: String) -> Result<>

#[tauri::command]
fn dlltest(app_handle: tauri::AppHandle, a: i32, b: i32) -> Result<String, String> {
    let libpath = app_handle
        .path()
        .resolve("resources/clibs/libmathlib.dylib", BaseDirectory::Resource)
        .expect("resources error")
        .to_string_lossy()
        .into_owned();
    let result = unsafe {
        let lib = Library::new(libpath).expect("加载库异常");
        let my_add: Symbol<AddFunc> = lib.get(b"add").map_err(|_e| "加载函数异常")?;
        my_add(a, b)
    };
    Ok(format!("{} + {} = {}", a, b, result))
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
        .invoke_handler(tauri::generate_handler![
            dlltest,
            send_to_vrc_chat,
            get_qiniu_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
