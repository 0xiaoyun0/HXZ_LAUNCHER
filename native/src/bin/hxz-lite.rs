#![windows_subsystem = "windows"]

use std::{env, io, process::Command};

fn open_launcher() -> io::Result<()> {
    let host = env::current_exe()?.with_file_name("幻想镇 3rd.exe");
    Command::new(host).arg("--lite").spawn()?;
    Ok(())
}

fn main() {
    if open_launcher().is_err() {
        rfd::MessageDialog::new()
            .set_title("幻想镇 · 极简启动")
            .set_description(
                "无法打开启动器。请将极简版与「幻想镇 3rd.exe」放在同一个安装目录中，然后重试。",
            )
            .set_level(rfd::MessageLevel::Error)
            .show();
        std::process::exit(1);
    }
}
