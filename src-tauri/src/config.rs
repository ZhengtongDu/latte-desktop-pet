use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

pub const DEFAULT_SCALE: f64 = 0.68;

pub fn default_scale() -> f64 {
    DEFAULT_SCALE
}

pub fn default_true() -> bool {
    true
}

pub fn default_fps_cap() -> u16 {
    30
}

pub fn default_outfit_id() -> String {
    "donut-yellow".to_string()
}

pub fn default_gear_theme() -> String {
    "dark-rgb".to_string()
}

pub fn default_scene_id() -> String {
    "none".to_string()
}

pub fn normalize_fps_cap(raw: u16) -> u16 {
    match raw {
        20 => 20,
        30 => 30,
        _ => 0,
    }
}

pub fn normalize_outfit_id(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return default_outfit_id();
    }
    if trimmed.starts_with("custom:")
        || matches!(trimmed, "none" | "donut-yellow" | "bell-collar")
    {
        trimmed.to_string()
    } else {
        "none".to_string()
    }
}

pub fn normalize_gear_theme(raw: &str) -> String {
    match raw.trim() {
        "snow-white" => "snow-white".to_string(),
        "cream-retro" => "cream-retro".to_string(),
        "sakura-pink" => "sakura-pink".to_string(),
        _ => default_gear_theme(),
    }
}

pub fn normalize_scene_id(raw: &str) -> String {
    match raw.trim() {
        "bookshelf" => "bookshelf".to_string(),
        "kitchen" => "kitchen".to_string(),
        "litterbox" => "litterbox".to_string(),
        "window" => "window".to_string(),
        _ => default_scene_id(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default)]
    pub x: Option<i32>,
    #[serde(default)]
    pub y: Option<i32>,
    #[cfg(target_os = "macos")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_id: Option<String>,
    #[serde(default = "default_scale")]
    pub scale: f64,
    #[serde(default = "default_true")]
    pub privacy_password_guard: bool,
    #[serde(default = "default_fps_cap")]
    pub fps_cap: u16,
    #[serde(default = "default_outfit_id")]
    pub outfit_id: String,
    #[serde(default)]
    pub harness_on: bool,
    #[serde(default = "default_gear_theme")]
    pub gear_theme: String,
    #[serde(default = "default_scene_id")]
    pub scene_id: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            #[cfg(target_os = "macos")]
            display_id: None,
            scale: default_scale(),
            privacy_password_guard: true,
            fps_cap: default_fps_cap(),
            outfit_id: default_outfit_id(),
            harness_on: false,
            gear_theme: default_gear_theme(),
            scene_id: default_scene_id(),
        }
    }
}

pub fn app_data_dir() -> PathBuf {
    #[cfg(target_os = "macos")]
    if let Some(home) = std::env::var_os("HOME") {
        return PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("kuro-cat-pet");
    }
    PathBuf::from(".").join("kuro-cat-pet")
}

pub fn config_path() -> PathBuf {
    app_data_dir().join("settings.json")
}

pub fn load_settings() -> AppSettings {
    let path = config_path();
    if let Ok(raw) = fs::read_to_string(&path) {
        if let Ok(mut parsed) = serde_json::from_str::<AppSettings>(&raw) {
            parsed.scale = parsed.scale.clamp(0.35, 1.40);
            parsed.fps_cap = normalize_fps_cap(parsed.fps_cap);
            parsed.outfit_id = normalize_outfit_id(&parsed.outfit_id);
            parsed.gear_theme = normalize_gear_theme(&parsed.gear_theme);
            parsed.scene_id = normalize_scene_id(&parsed.scene_id);
            return parsed;
        }
    }
    AppSettings::default()
}

pub fn save_settings(settings: &AppSettings) {
    let path = config_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(settings) {
        let _ = fs::write(path, json);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_settings_json_deserializes_cleanly() {
        let legacy = r#"{
            "x": 100,
            "y": 200,
            "scale": 0.7,
            "catBreed": "latte",
            "obsEnabled": false,
            "mcpEnabled": true,
            "fpsCap": 20,
            "outfitId": "bell-collar",
            "harnessOn": true
        }"#;
        let parsed: AppSettings = serde_json::from_str(legacy).unwrap();
        assert_eq!(parsed.fps_cap, 20);
        assert_eq!(parsed.outfit_id, "bell-collar");
        assert!(parsed.harness_on);
        assert!(parsed.privacy_password_guard);
        assert_eq!(parsed.gear_theme, "dark-rgb");
        assert_eq!(parsed.scene_id, "none");
    }
}
