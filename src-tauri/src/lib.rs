use aws_config::BehaviorVersion;
use rand::Rng;
use rosc::{OscMessage, OscPacket, OscType};
use std::net::UdpSocket;
use std::path::Path;
use tauri_plugin_dialog::DialogExt;

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

/// Generate a 4-character random alphanumeric string (lowercase)
fn generate_random_key() -> String {
    const CHARSET: &[u8] = b"abcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::thread_rng();
    (0..4)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

#[tauri::command]
async fn upload_oss(
    app: tauri::AppHandle,
    region: String,
    endpoint: String,
    ak: String,
    sk: String,
    bucket: String,
) -> Result<String, String> {
    // Open file dialog
    let file_path = app
        .dialog()
        .file()
        .blocking_pick_file()
        .ok_or("No file selected")?;

    let path = file_path.as_path().ok_or("Invalid file path")?;

    // Get file extension
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e))
        .unwrap_or_default();

    // Generate random key
    let key = generate_random_key() + &ext;

    // Create S3 client
    let client = create_s3_client(&region, &endpoint, &ak, &sk);

    // Read file content
    let file_content = tokio::fs::read(path).await.map_err(|e| e.to_string())?;

    // Get content type
    let content_type = mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string();

    // Upload to S3
    client
        .put_object()
        .bucket(&bucket)
        .key(&key)
        .body(file_content.into())
        .content_type(&content_type)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(key)
}

fn create_s3_client(region: &str, endpoint: &str, ak: &str, sk: &str) -> aws_sdk_s3::Client {
    let credentials = aws_sdk_s3::config::Credentials::new(ak, sk, None, None, "custom");
    let config = aws_sdk_s3::config::Config::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(aws_sdk_s3::config::Region::new(region.to_string()))
        .endpoint_url(endpoint)
        .credentials_provider(credentials)
        .build();

    aws_sdk_s3::Client::from_conf(config)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![send_to_vrc_chat, upload_oss])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
