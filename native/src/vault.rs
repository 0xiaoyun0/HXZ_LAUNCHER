use std::ptr;
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    },
};

pub fn transform(data: &[u8], encrypt: bool) -> Result<Vec<u8>, String> {
    if data.len() > 8 * 1024 * 1024 {
        return Err("凭据记录过大".into());
    }
    let input = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr() as *mut _,
    };
    let mut result = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: ptr::null_mut(),
    };
    // DPAPI binds the value to the signed-in Windows user. The OS owns the output allocation.
    unsafe {
        let ok = if encrypt {
            CryptProtectData(
                &input,
                ptr::null(),
                ptr::null(),
                ptr::null(),
                ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut result,
            )
        } else {
            CryptUnprotectData(
                &input,
                ptr::null_mut(),
                ptr::null(),
                ptr::null(),
                ptr::null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut result,
            )
        };
        if ok == 0 {
            return Err(format!(
                "Windows 凭据服务出错 ({})",
                std::io::Error::last_os_error()
            ));
        }
        let bytes = if result.cbData == 0 {
            Vec::new()
        } else {
            std::slice::from_raw_parts(result.pbData, result.cbData as usize).to_vec()
        };
        LocalFree(result.pbData as _);
        Ok(bytes)
    }
}

#[test]
fn round_trip() {
    let plain = b"local-test-record";
    let encrypted = transform(plain, true).unwrap();
    assert_ne!(plain.as_slice(), encrypted);
    assert_eq!(transform(&encrypted, false).unwrap(), plain);
}
