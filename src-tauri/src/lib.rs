use rosc::{OscMessage, OscPacket, OscType};
use std::net::UdpSocket;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn send_to_vrc_chat(text: String) -> Result<(), String> {
    let sock = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    let addr = "127.0.0.1:9000";

    let msg = OscMessage {
        addr: "/chatbox/input".to_string(),
        args: vec![
            OscType::String(text),
            OscType::Bool(true),
        ],
    };

    let packet = OscPacket::Message(msg);
    let buf = rosc::encoder::encode(&packet).map_err(|e| e.to_string())?;

    sock.send_to(&buf, addr).map_err(|e| e.to_string())?;

    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet,send_to_vrc_chat])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
