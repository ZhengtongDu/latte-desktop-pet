use crate::config::AppSettings;
use crate::{
    apply_scale_and_save, is_pet_visible, reset_window_position, set_pet_visible, AppState,
};
use std::sync::{Mutex, OnceLock};
use tauri::image::Image;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Listener, Manager, Wry};

#[derive(Clone)]
struct TrayCheckHandles {
    privacy_guard: CheckMenuItem<Wry>,
    fps_60: CheckMenuItem<Wry>,
    fps_30: CheckMenuItem<Wry>,
    fps_20: CheckMenuItem<Wry>,
    scale_s: CheckMenuItem<Wry>,
    scale_m: CheckMenuItem<Wry>,
    scale_l: CheckMenuItem<Wry>,
}

fn active_handles() -> &'static Mutex<Option<TrayCheckHandles>> {
    static HANDLES: OnceLock<Mutex<Option<TrayCheckHandles>>> = OnceLock::new();
    HANDLES.get_or_init(|| Mutex::new(None))
}

fn sync_checkmarks(s: &AppSettings) {
    if let Ok(guard) = active_handles().lock() {
        if let Some(h) = guard.as_ref() {
            let _ = h.privacy_guard.set_checked(s.privacy_password_guard);
            let _ = h.fps_20.set_checked(s.fps_cap == 20);
            let _ = h.fps_30.set_checked(s.fps_cap == 30);
            let _ = h.fps_60.set_checked(s.fps_cap != 30 && s.fps_cap != 20);
            let _ = h.scale_s.set_checked(s.scale < 0.62);
            let _ = h.scale_m.set_checked((0.62..=0.76).contains(&s.scale));
            let _ = h.scale_l.set_checked(s.scale > 0.76);
        }
    }
}

fn build_tray_menu(
    app: &AppHandle,
    initial: &AppSettings,
) -> tauri::Result<(Menu<Wry>, TrayCheckHandles)> {
    let toggle_show = MenuItem::with_id(app, "toggle_show", "显示 / 隐藏拿铁", true, None::<&str>)?;

    // 配饰
    let custom_acc = crate::accessories::list_custom_accessories();
    let wardrobe_menu = Submenu::with_id(app, "wardrobe_menu", "配饰", true)?;
    for (id, label) in [
        ("none", "无"),
        ("donut-yellow", "甜甜圈"),
        ("bell-collar", "铃铛项圈"),
    ] {
        wardrobe_menu.append(&CheckMenuItem::with_id(
            app,
            format!("outfit:{id}"),
            label,
            true,
            initial.outfit_id == id,
            None::<&str>,
        )?)?;
    }
    for acc in custom_acc.iter().filter(|a| a.slot == "outfit") {
        wardrobe_menu.append(&CheckMenuItem::with_id(
            app,
            format!("outfit:{}", acc.id),
            acc.name.clone(),
            true,
            initial.outfit_id == acc.id,
            None::<&str>,
        )?)?;
    }
    wardrobe_menu.append(&PredefinedMenuItem::separator(app)?)?;
    wardrobe_menu.append(&CheckMenuItem::with_id(
        app,
        "harness_toggle",
        "胸背带",
        true,
        initial.harness_on,
        None::<&str>,
    )?)?;
    wardrobe_menu.append(&PredefinedMenuItem::separator(app)?)?;
    wardrobe_menu.append(&MenuItem::with_id(
        app,
        "open_accessories_folder",
        "自定义配件…",
        true,
        None::<&str>,
    )?)?;

    // 外设主题
    let gear_menu = Submenu::with_id(app, "gear_menu", "外设主题", true)?;
    for (id, label) in [
        ("dark-rgb", "暗夜"),
        ("snow-white", "纯白"),
        ("cream-retro", "奶霜"),
        ("sakura-pink", "樱粉"),
    ] {
        gear_menu.append(&CheckMenuItem::with_id(
            app,
            format!("gear:{id}"),
            label,
            true,
            initial.gear_theme == id,
            None::<&str>,
        )?)?;
    }

    // 背景装饰
    let scene_menu = Submenu::with_id(app, "scene_menu", "背景装饰", true)?;
    for (id, label) in [
        ("none", "无"),
        ("bookshelf", "书房"),
        ("kitchen", "厨房"),
        ("litterbox", "猫砂盆"),
        ("window", "阳光窗台"),
    ] {
        scene_menu.append(&CheckMenuItem::with_id(
            app,
            format!("scene:{id}"),
            label,
            true,
            initial.scene_id == id,
            None::<&str>,
        )?)?;
    }

    // 大小
    let scale_s = CheckMenuItem::with_id(app, "scale_s", "小", true, initial.scale < 0.62, None::<&str>)?;
    let scale_m = CheckMenuItem::with_id(app, "scale_m", "中（默认）", true, (0.62..=0.76).contains(&initial.scale), None::<&str>)?;
    let scale_l = CheckMenuItem::with_id(app, "scale_l", "大", true, initial.scale > 0.76, None::<&str>)?;
    let scale_menu = Submenu::with_items(app, "大小", true, &[&scale_s, &scale_m, &scale_l])?;

    // 省电
    let fps_60 = CheckMenuItem::with_id(app, "fps_60", "流畅", true, initial.fps_cap != 30 && initial.fps_cap != 20, None::<&str>)?;
    let fps_30 = CheckMenuItem::with_id(app, "fps_30", "均衡", true, initial.fps_cap == 30, None::<&str>)?;
    let fps_20 = CheckMenuItem::with_id(app, "fps_20", "省电", true, initial.fps_cap == 20, None::<&str>)?;
    let fps_menu = Submenu::with_items(app, "省电", true, &[&fps_60, &fps_30, &fps_20])?;

    let privacy_guard = CheckMenuItem::with_id(
        app,
        "privacy_guard",
        "输密码时捂眼",
        true,
        initial.privacy_password_guard,
        None::<&str>,
    )?;

    #[cfg(target_os = "macos")]
    let mac_input_menu = {
        let mac_reset = MenuItem::with_id(app, "mac_reset_permissions", "重置并重新授权", true, None::<&str>)?;
        let mac_reconnect = MenuItem::with_id(app, "mac_reconnect_input", "重新连接输入监听", true, None::<&str>)?;
        let mac_sep = PredefinedMenuItem::separator(app)?;
        let mac_listen = MenuItem::with_id(app, "mac_open_input_monitoring", "打开输入监控设置…", true, None::<&str>)?;
        let mac_ax = MenuItem::with_id(app, "mac_open_accessibility", "打开辅助功能设置…", true, None::<&str>)?;
        Submenu::with_items(
            app,
            "键盘权限",
            true,
            &[&mac_reset, &mac_reconnect, &mac_sep, &mac_listen, &mac_ax],
        )?
    };

    let reset_pos = MenuItem::with_id(app, "reset_pos", "重置位置", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    #[cfg(target_os = "macos")]
    let menu = Menu::with_items(
        app,
        &[
            &toggle_show,
            &sep1,
            &wardrobe_menu,
            &gear_menu,
            &scene_menu,
            &scale_menu,
            &fps_menu,
            &privacy_guard,
            &sep2,
            &mac_input_menu,
            &reset_pos,
            &quit,
        ],
    )?;

    #[cfg(not(target_os = "macos"))]
    let menu = Menu::with_items(
        app,
        &[
            &toggle_show,
            &sep1,
            &wardrobe_menu,
            &gear_menu,
            &scene_menu,
            &scale_menu,
            &fps_menu,
            &privacy_guard,
            &sep2,
            &reset_pos,
            &quit,
        ],
    )?;

    let handles = TrayCheckHandles {
        privacy_guard,
        fps_60,
        fps_30,
        fps_20,
        scale_s,
        scale_m,
        scale_l,
    };

    Ok((menu, handles))
}

pub fn refresh_tray(app: &AppHandle) {
    let state = app.state::<AppState>();
    let settings = state.settings.lock().unwrap().clone();
    if let Ok((new_menu, new_handles)) = build_tray_menu(app, &settings) {
        if let Ok(mut guard) = active_handles().lock() {
            *guard = Some(new_handles);
        }
        if let Some(tray) = app.tray_by_id("kuro-tray") {
            let _ = tray.set_menu(Some(new_menu));
        }
    }
}

fn apply_fps_and_save(app: &AppHandle, cap: u16) {
    let state = app.state::<AppState>();
    let updated = {
        let mut s = state.settings.lock().unwrap();
        s.fps_cap = crate::config::normalize_fps_cap(cap);
        crate::config::save_settings(&s);
        s.clone()
    };
    sync_checkmarks(&updated);
    let _ = app.emit("kuro-settings", updated);
}

pub fn setup_tray(app: &AppHandle, initial: &AppSettings) -> tauri::Result<()> {
    let (menu, handles) = build_tray_menu(app, initial)?;
    if let Ok(mut guard) = active_handles().lock() {
        *guard = Some(handles);
    }

    let icon = Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;

    app.listen("kuro-settings", move |ev| {
        if let Ok(s) = serde_json::from_str::<AppSettings>(ev.payload()) {
            sync_checkmarks(&s);
        }
    });

    TrayIconBuilder::with_id("kuro-tray")
        .icon(icon)
        .tooltip("拿铁桌宠")
        .menu(&menu)
        .show_menu_on_left_click(cfg!(target_os = "macos"))
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let vis = is_pet_visible(app);
                set_pet_visible(app, !vis);
            }
        })
        .on_menu_event(move |app, event| {
            let state = app.state::<AppState>();
            match event.id().as_ref() {
                "toggle_show" => set_pet_visible(app, !is_pet_visible(app)),
                "harness_toggle" => {
                    let updated = {
                        let mut s = state.settings.lock().unwrap();
                        s.harness_on = !s.harness_on;
                        crate::config::save_settings(&s);
                        s.clone()
                    };
                    refresh_tray(app);
                    let _ = app.emit("kuro-settings", updated);
                }
                "privacy_guard" => {
                    let updated = {
                        let mut s = state.settings.lock().unwrap();
                        s.privacy_password_guard = !s.privacy_password_guard;
                        crate::config::save_settings(&s);
                        s.clone()
                    };
                    sync_checkmarks(&updated);
                    let _ = app.emit("kuro-settings", updated);
                }
                "scale_s" => apply_scale_and_save(app, 0.55),
                "scale_m" => apply_scale_and_save(app, 0.68),
                "scale_l" => apply_scale_and_save(app, 0.85),
                "fps_60" => apply_fps_and_save(app, 0),
                "fps_30" => apply_fps_and_save(app, 30),
                "fps_20" => apply_fps_and_save(app, 20),
                "open_accessories_folder" => {
                    let _ = crate::accessories::open_accessories_folder();
                }
                #[cfg(target_os = "macos")]
                "mac_reset_permissions" => {
                    crate::input_hook::macos_hook::reset_and_request_macos_permissions();
                }
                #[cfg(target_os = "macos")]
                "mac_reconnect_input" => {
                    crate::input_hook::macos_hook::trigger_macos_reconnect();
                }
                #[cfg(target_os = "macos")]
                "mac_open_input_monitoring" => {
                    crate::input_hook::macos_hook::open_macos_privacy_pane("input_monitoring");
                }
                #[cfg(target_os = "macos")]
                "mac_open_accessibility" => {
                    crate::input_hook::macos_hook::open_macos_privacy_pane("accessibility");
                }
                "reset_pos" => reset_window_position(app),
                "quit" => app.exit(0),
                other => {
                    if let Some(outfit_id) = other.strip_prefix("outfit:") {
                        let updated = {
                            let mut s = state.settings.lock().unwrap();
                            s.outfit_id = crate::config::normalize_outfit_id(outfit_id);
                            crate::config::save_settings(&s);
                            s.clone()
                        };
                        refresh_tray(app);
                        let _ = app.emit("kuro-settings", updated);
                    } else if let Some(gear) = other.strip_prefix("gear:") {
                        let updated = {
                            let mut s = state.settings.lock().unwrap();
                            s.gear_theme = crate::config::normalize_gear_theme(gear);
                            crate::config::save_settings(&s);
                            s.clone()
                        };
                        refresh_tray(app);
                        let _ = app.emit("kuro-settings", updated);
                    } else if let Some(scene) = other.strip_prefix("scene:") {
                        let updated = {
                            let mut s = state.settings.lock().unwrap();
                            s.scene_id = crate::config::normalize_scene_id(scene);
                            crate::config::save_settings(&s);
                            s.clone()
                        };
                        refresh_tray(app);
                        let _ = app.emit("kuro-settings", updated);
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
