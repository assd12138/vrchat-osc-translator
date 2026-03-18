pub fn openvr_test() -> String {
    let context = unsafe {
        match openvr::init(openvr::ApplicationType::Overlay) {
            Ok(vr) => vr,
            Err(e) => return e.to_string(),
        }
    };
    let system = context.system().unwrap();
    let size = system.recommended_render_target_size();
    let a = context.render_models().unwrap();

    format!("{}||{}", size.0, size.1)
}
