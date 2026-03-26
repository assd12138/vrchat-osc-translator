use qiniu_upload_token::{credential::Credential, UploadPolicy};
use rosc::{OscMessage, OscPacket, OscType};
use std::net::UdpSocket;
use std::time::Duration;

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
            send_to_vrc_chat,
            get_qiniu_token
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
