//! Pluggable external wardrobe / accessory loader (`accessories/` under app_data_dir).
//!
//! Drop any transparent `.png` or `.webp` image into the `accessories/` directory:
//! - Optional sidecar `<stem>.json` overrides slot/anchor/scale/offset/rotation/layer/name/emoji.
//! - Without a JSON sidecar, filename prefix infers the slot automatically:
//!   - `hat_*` / `head_*` -> `headwear`
//!   - `eye_*` / `glasses_*` / `shades_*` -> `eyewear`
//!   - anything else (or `outfit_*` / `collar_*` / `clothes_*`) -> `outfit`
//!
//! Images are lazy-loaded on demand (`load_custom_accessory_image`) so unequipped items consume 0 RAM!

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomAccessoryMeta {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub emoji: Option<String>,
    pub slot: String, // "outfit" | "headwear" | "eyewear"
    #[serde(default)]
    pub anchor_x: Option<f64>,
    #[serde(default)]
    pub anchor_y: Option<f64>,
    #[serde(default)]
    pub scale: Option<f64>,
    #[serde(default)]
    pub offset_x: Option<f64>,
    #[serde(default)]
    pub offset_y: Option<f64>,
    #[serde(default)]
    pub rotation: Option<f64>,
    #[serde(default)]
    pub layer: Option<String>, // "front" | "back"
    #[serde(default)]
    pub file_name: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SidecarMeta {
    name: Option<String>,
    emoji: Option<String>,
    slot: Option<String>,
    anchor_x: Option<f64>,
    anchor_y: Option<f64>,
    scale: Option<f64>,
    offset_x: Option<f64>,
    offset_y: Option<f64>,
    rotation: Option<f64>,
    layer: Option<String>,
}

pub fn accessories_dir() -> PathBuf {
    crate::config::app_data_dir().join("accessories")
}

pub fn ensure_accessories_dir() -> Result<PathBuf, String> {
    let dir = accessories_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let readme = dir.join("README.txt");
    if !readme.exists() {
        let guide = "\
拿铁桌宠 · 外挂服装与配件目录 (Pluggable Accessories)\n\
=====================================================\n\n\
直接把透明底 PNG 或 WebP 图片放进这个文件夹，右键菜单就会自动识别并可随时换装！\n\n\
1. 懒人命名自动识别槽位（不需要写 JSON）：\n\
   - 衣服/脖饰（默认）：outfit_毛衣.png  或  小披风.webp\n\
   - 头饰/帽子：hat_圣诞帽.png  或  head_贝雷帽.webp\n\
   - 眼饰/墨镜：eye_墨镜.png  或  glasses_圆框镜.png\n\n\
2. 进阶精准微调（可选同名 .json，例如 hat_圣诞帽.json）：\n\
   {\n\
     \"name\": \"圣诞帽\",\n\
     \"emoji\": \"🎅\",\n\
     \"slot\": \"headwear\",\n\
     \"scale\": 1.0,\n\
     \"offsetX\": 0,\n\
     \"offsetY\": -8,\n\
     \"rotation\": 0,\n\
     \"layer\": \"front\"\n\
   }\n\n\
提示：未穿戴的自定义图片不会被预解码，占用 0 内存。\n";
        let _ = fs::write(&readme, guide);
    }
    Ok(dir)
}

fn infer_slot_and_name(stem: &str) -> (&'static str, String, &'static str) {
    let lower = stem.to_ascii_lowercase();
    for prefix in ["hat_", "head_", "cap_"] {
        if lower.starts_with(prefix) {
            let trimmed = stem[prefix.len()..].trim_matches(['_', '-', ' ']);
            let name = if trimmed.is_empty() { stem } else { trimmed };
            return ("headwear", name.to_string(), "🎩");
        }
    }
    for prefix in ["eye_", "eyes_", "glasses_", "shades_"] {
        if lower.starts_with(prefix) {
            let trimmed = stem[prefix.len()..].trim_matches(['_', '-', ' ']);
            let name = if trimmed.is_empty() { stem } else { trimmed };
            return ("eyewear", name.to_string(), "🕶️");
        }
    }
    for prefix in ["outfit_", "collar_", "clothes_", "neck_"] {
        if lower.starts_with(prefix) {
            let trimmed = stem[prefix.len()..].trim_matches(['_', '-', ' ']);
            let name = if trimmed.is_empty() { stem } else { trimmed };
            return ("outfit", name.to_string(), "👕");
        }
    }
    ("outfit", stem.to_string(), "👕")
}

fn normalize_slot(raw: &str) -> &'static str {
    match raw.trim().to_ascii_lowercase().as_str() {
        "headwear" | "hat" | "head" => "headwear",
        "eyewear" | "eye" | "glasses" => "eyewear",
        _ => "outfit",
    }
}

fn sanitize_stem(raw: &str) -> String {
    let cleaned: String = raw
        .trim()
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c.to_ascii_lowercase()
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches('_');
    if trimmed.is_empty() {
        "item".to_string()
    } else {
        trimmed.chars().take(48).collect()
    }
}

fn is_supported_image(path: &Path) -> bool {
    let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
        return false;
    };
    matches!(ext.to_ascii_lowercase().as_str(), "png" | "webp")
}

pub fn list_custom_accessories() -> Vec<CustomAccessoryMeta> {
    let dir = accessories_dir();
    let Ok(entries) = fs::read_dir(&dir) else {
        return vec![];
    };

    let mut out = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_supported_image(&path) {
            continue;
        }
        let Some(file_name) = path.file_name().and_then(|s| s.to_str()).map(String::from) else {
            continue;
        };
        let Some(stem) = path.file_stem().and_then(|s| s.to_str()) else {
            continue;
        };
        let (default_slot, default_name, default_emoji) = infer_slot_and_name(stem);

        let sidecar_path = path.with_extension("json");
        let sidecar: SidecarMeta = fs::read_to_string(&sidecar_path)
            .ok()
            .and_then(|raw| serde_json::from_str(&raw).ok())
            .unwrap_or_default();

        let slot = sidecar
            .slot
            .as_deref()
            .map(normalize_slot)
            .unwrap_or(default_slot)
            .to_string();
        let id = format!("custom:{}", sanitize_stem(&file_name));

        out.push(CustomAccessoryMeta {
            id,
            name: sidecar
                .name
                .filter(|s| !s.trim().is_empty())
                .unwrap_or(default_name),
            emoji: sidecar
                .emoji
                .filter(|s| !s.trim().is_empty())
                .or_else(|| Some(default_emoji.to_string())),
            slot,
            anchor_x: sidecar.anchor_x,
            anchor_y: sidecar.anchor_y,
            scale: sidecar.scale,
            offset_x: sidecar.offset_x,
            offset_y: sidecar.offset_y,
            rotation: sidecar.rotation,
            layer: sidecar.layer.map(|l| {
                if l.eq_ignore_ascii_case("back") {
                    "back".to_string()
                } else {
                    "front".to_string()
                }
            }),
            file_name: Some(file_name),
        });
    }
    out.sort_by(|a, b| a.name.cmp(&b.name));
    out
}

fn base64_encode(input: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(input.len().div_ceil(3) * 4);
    for chunk in input.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };
        let n = (b0 << 16) | (b1 << 8) | b2;
        out.push(TABLE[((n >> 18) & 63) as usize] as char);
        out.push(TABLE[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 {
            TABLE[((n >> 6) & 63) as usize] as char
        } else {
            '='
        });
        out.push(if chunk.len() > 2 {
            TABLE[(n & 63) as usize] as char
        } else {
            '='
        });
    }
    out
}

pub fn load_custom_accessory_image(id: &str) -> Option<String> {
    let list = list_custom_accessories();
    let item = list.into_iter().find(|x| x.id == id)?;
    let file_name = item.file_name?;
    let path = accessories_dir().join(&file_name);
    let meta = fs::metadata(&path).ok()?;
    // Guard against accidentally loading giant >4MB uncompressed textures into memory
    if meta.len() > 4 * 1024 * 1024 {
        return None;
    }
    let bytes = fs::read(&path).ok()?;
    let mime = match path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "webp" => "image/webp",
        _ => "image/png",
    };
    Some(format!("data:{};base64,{}", mime, base64_encode(&bytes)))
}

pub fn open_accessories_folder() -> Result<String, String> {
    let dir = ensure_accessories_dir()?;
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&dir).spawn();
    }
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("explorer.exe").arg(&dir).spawn();
    }
    #[cfg(all(not(windows), not(target_os = "macos")))]
    {
        let _ = std::process::Command::new("xdg-open").arg(&dir).spawn();
    }
    Ok(dir.to_string_lossy().to_string())
}
