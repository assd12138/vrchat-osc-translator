use libloading::{Library, Symbol};
use tauri::path::BaseDirectory;
use tauri::Manager;

/// 预加载的动态库
pub struct LoadedLibs {
    /// 保存 Library 实例，防止被释放
    _math_lib: Library,
    /// 预加载的 add 函数句柄
    add_func: super::AddFunc,
}

impl LoadedLibs {
    /// 在应用启动时加载所有需要的动态库
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        let lib = dynamic_load("mathlib".to_string(), app_handle)?;

        unsafe {
            let add_func: Symbol<super::AddFunc> =
                lib.get(b"add").map_err(|_| "加载 add 函数失败")?;
            // 先提取函数指针，解除与 lib 的生命周期绑定
            let add_func_ptr = *add_func.into_raw();

            Ok(LoadedLibs {
                _math_lib: lib,
                add_func: add_func_ptr,
            })
        }
    }

    /// 获取 add 函数句柄
    pub fn get_add_func(&self) -> super::AddFunc {
        self.add_func
    }
}

/// 根据平台不同，动态加载动态库
/// 返回 Library 实例供调用者管理生命周期
pub fn dynamic_load(
    lib_name: String,
    app_handle: &tauri::AppHandle,
) -> Result<Library, String> {
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

    unsafe {
        Library::new(&lib_path).map_err(|e| format!("加载库失败 [{}]: {}", lib_path, e))
    }
}
