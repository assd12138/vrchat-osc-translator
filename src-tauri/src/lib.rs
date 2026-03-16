use libloading::{Library, Symbol};
use qiniu_upload_token::{credential::Credential, UploadPolicy};
use rosc::{OscMessage, OscPacket, OscType};
use std::net::UdpSocket;
use std::time::Duration;
use tauri::path::BaseDirectory;
use tauri::Manager;

type AddFunc = unsafe extern "C" fn(i32, i32) -> i32;

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

/// 预加载的动态库
struct LoadedLibs {
    /// 保存 Library 实例，防止被释放
    _math_lib: Library,
    /// 预加载的 add 函数句柄
    add_func: AddFunc,
}

impl LoadedLibs {
    /// 在应用启动时加载所有需要的动态库
    fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        let lib = dynamic_load("mathlib".to_string(), app_handle)?;

        unsafe {
            let add_func: Symbol<AddFunc> = lib.get(b"add").map_err(|_| "加载 add 函数失败")?;
            // 先提取函数指针，解除与 lib 的生命周期绑定
            let add_func_ptr = *add_func.into_raw();

            Ok(LoadedLibs {
                _math_lib: lib,
                add_func: add_func_ptr,
            })
        }
    }
}

/// 根据平台不同，动态加载动态库
/// 返回 Library 实例供调用者管理生命周期
fn dynamic_load(lib_name: String, app_handle: &tauri::AppHandle) -> Result<Library, String> {
    let (prefix, suffix) = if cfg!(target_os = "windows") {
        ("", ".dll")
    } else if cfg!(target_os = "macos") || cfg!(target_os = "ios") {
        ("lib", ".dylib")
    } else {
        // Linux, Android, etc.
        ("lib", ".so")
    };

    let filename = format!("{}{}{}", prefix, lib_name, suffix);
    let lib_path = app_handle
        .path()
        .resolve(
            &format!("resources/clibs/{}", filename),
            BaseDirectory::Resource,
        )
        .map_err(|e| format!("资源路径解析失败：{}", e))?
        .to_string_lossy()
        .into_owned();

    unsafe { Library::new(&lib_path).map_err(|e| format!("加载库失败 [{}]: {}", lib_path, e)) }
}

#[tauri::command]
fn dlltest(a: i32, b: i32, state: tauri::State<AppState>) -> Result<String, String> {
    // 直接使用预加载的函数句柄
    let result = unsafe { (state.loaded_libs.add_func)(a, b) };
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
