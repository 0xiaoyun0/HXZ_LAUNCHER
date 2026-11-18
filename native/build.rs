fn main() {
    println!("cargo:rerun-if-changed=../apps/desktop/dist");
    std::fs::create_dir_all("icons").expect("create generated icon directory");
    for icon in ["icon.ico", "icon.png"] {
        let source = format!("../resources/{icon}");
        println!("cargo:rerun-if-changed={source}");
        std::fs::copy(source, format!("icons/{icon}")).expect("copy canonical app icon");
    }
    tauri_build::build()
}
