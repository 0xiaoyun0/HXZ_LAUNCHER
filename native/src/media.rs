use std::{
    fs::File,
    io::{Read, Seek, SeekFrom},
    path::Path,
};
use tauri::http::{Request, Response};

pub fn response(home: &Path, req: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    let empty = |code| Response::builder().status(code).body(Vec::new()).unwrap();
    let name = req.uri().path().trim_start_matches('/');
    let Some((key, ext)) = name.split_once('.') else {
        return empty(404);
    };
    if key.len() != 36 || !key.bytes().all(|b| b.is_ascii_hexdigit() || b == b'-') {
        return empty(404);
    }
    let mime = match ext {
        "mp3" => "audio/mpeg",
        "m4a" | "aac" => "audio/mp4",
        "wav" => "audio/wav",
        "ogg" | "opus" => "audio/ogg",
        "flac" => "audio/flac",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => return empty(404),
    };
    let path = home.join("media").join(name);
    if !std::fs::symlink_metadata(&path).is_ok_and(|m| m.is_file()) {
        return empty(404);
    }
    let Ok(mut f) = File::open(path) else {
        return empty(404);
    };
    let Ok(meta) = f.metadata() else {
        return empty(404);
    };
    let size = meta.len();
    let mut builder = Response::builder()
        .header("Content-Type", mime)
        .header("Accept-Ranges", "bytes")
        .header("Access-Control-Allow-Origin", "*");
    let (start, end) = if let Some(range) = req.headers().get("range") {
        let Some((a, b)) = range
            .to_str()
            .ok()
            .and_then(|s| s.strip_prefix("bytes="))
            .and_then(|s| s.split_once('-'))
        else {
            return empty(416);
        };
        if size == 0 {
            return empty(416);
        }
        let part = if a.is_empty() {
            match b.parse::<u64>() {
                Ok(n) if n > 0 => (size.saturating_sub(n), size - 1),
                _ => return empty(416),
            }
        } else {
            let Ok(s) = a.parse::<u64>() else {
                return empty(416);
            };
            let e = if b.is_empty() {
                size - 1
            } else {
                match b.parse::<u64>() {
                    Ok(v) => v.min(size - 1),
                    Err(_) => return empty(416),
                }
            };
            (s, e)
        };
        if part.0 > part.1 || part.0 >= size {
            return empty(416);
        }
        builder = builder.status(206).header(
            "Content-Range",
            format!("bytes {}-{}/{}", part.0, part.1, size),
        );
        part
    } else {
        (0, size.saturating_sub(1))
    };
    let count = if size == 0 { 0 } else { end - start + 1 };
    if count > 128 * 1024 * 1024 {
        return empty(413);
    }
    let mut bytes = Vec::new();
    if req.method() != "HEAD"
        && (f.seek(SeekFrom::Start(start)).is_err()
            || f.take(count).read_to_end(&mut bytes).is_err())
    {
        return empty(500);
    }
    builder.header("Content-Length", count).body(bytes).unwrap()
}
