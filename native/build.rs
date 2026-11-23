fn main() {
    println!("cargo:rerun-if-changed=../apps/desktop/dist");
    println!("cargo:rerun-if-env-changed=TAURI_CONFIG");
    std::fs::create_dir_all("icons").expect("create generated icon directory");
    for icon in ["icon.ico", "icon.png"] {
        let source = format!("../resources/{icon}");
        println!("cargo:rerun-if-changed={source}");
        std::fs::copy(source, format!("icons/{icon}")).expect("copy canonical app icon");
    }
    let manifest = "../.runtime/official-extensions.json";
    println!("cargo:rerun-if-changed={manifest}");
    let target = std::path::PathBuf::from(std::env::var_os("OUT_DIR").unwrap())
        .join("official-extensions.json");
    std::fs::write(
        target,
        std::fs::read(manifest).unwrap_or_else(|_| b"null".to_vec()),
    )
    .expect("write optional extension catalogue");
    tauri_build::build()
}
