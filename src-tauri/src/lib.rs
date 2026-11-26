mod accessories;
mod config;
mod input_hook;
#[cfg(target_os = "macos")]
mod macos_window;
mod privacy;
mod tray;

use config::{load_settings, normalize_fps_cap, normalize_outfit_id, save_settings, AppSettings};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, Size, State};

pub const BASE_WIDTH: f64 = 420.0;
pub const BASE_HEIGHT: f64 = 440.0;
const SIDE_MENU_LOGICAL_W: f64 = 268.0;
const SIDE_MENU_LOGICAL_H: f64 = 276.0;
const SIDE_MENU_IDLE_DESTROY_SECS: u64 = 25;

static GEOMETRY_DIRTY: AtomicBool = AtomicBool::new(true);

pub fn mark_geometry_dirty() {
    GEOMETRY_DIRTY.store(true, Ordering::Relaxed);
}

pub fn window_dimensions(scale: f64) -> (f64, f64) {
    let s = scale.clamp(0.35, 1.40);
    ((BASE_WIDTH * s).round().max(120.0), (BASE_HEIGHT * s).round().max(120.0))
}

pub struct AppState {
    pub settings: Arc<Mutex<AppSettings>>,
    pub menu_open: Arc<AtomicBool>,
    pub menu_creating: Arc<AtomicBool>,
    pub menu_close_gen: Arc<AtomicU64>,
    pub menu_opened_at: Arc<Mutex<Instant>>,
    pub dragging: Arc<AtomicBool>,
    pub paused_guard: Arc<AtomicBool>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct WindowCursorInfo {
    rel_x: f64,
    rel_y: f64,
    inside_window: bool,
    over_cat: bool,
}

pub fn is_pet_visible(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .and_then(|w| w.is_visible().ok())
        .unwrap_or(true)
}

pub fn set_pet_visible(app: &AppHandle, visible: bool) {
    mark_geometry_dirty();
    if let Some(win) = app.get_webview_window("main") {
        let _ = if visible { win.show() } else { win.hide() };
    }
}

fn resize_window_anchored_bottom_right(win: &tauri::WebviewWindow, scale: f64) -> Option<(i32, i32)> {
    let (new_w, new_h) = window_dimensions(scale);
    #[cfg(target_os = "macos")]
    if win.state::<AppState>().settings.lock().unwrap().display_id.is_some() {
        macos_window::resize_pinned(win, new_w, new_h);
        return None;
    }

    let sf = win.scale_factor().unwrap_or(1.0);
    let old_pos = win.outer_position().ok();
    let old_size = win.outer_size().ok();
    let _ = win.set_size(Size::Logical(LogicalSize::new(new_w, new_h)));

    if let (Some(pos), Some(sz)) = (old_pos, old_size) {
        let new_pw = (new_w * sf).round() as i32;
        let new_ph = (new_h * sf).round() as i32;
        let (new_x, new_y) = (pos.x + sz.width as i32 - new_pw, pos.y + sz.height as i32 - new_ph);
        if new_x != pos.x || new_y != pos.y {
            let _ = win.set_position(PhysicalPosition::new(new_x, new_y));
        }
        return Some((new_x, new_y));
    }
    None
}

pub fn apply_scale_and_save(app: &AppHandle, scale: f64) {
    let clamped = scale.clamp(0.35, 1.40);
    let new_pos = app
        .get_webview_window("main")
        .and_then(|win| resize_window_anchored_bottom_right(&win, clamped));
    let state = app.state::<AppState>();
    let updated = {
        let mut s = state.settings.lock().unwrap();
        s.scale = clamped;
        if let Some((nx, ny)) = new_pos {
            s.x = Some(nx);
            s.y = Some(ny);
        }
        save_settings(&s);
        s.clone()
    };
    mark_geometry_dirty();
    let _ = app.emit("kuro-settings", updated);
}

#[cfg(target_os = "macos")]
pub fn reset_window_position(app: &AppHandle) {
    mark_geometry_dirty();
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        let Some(win) = handle.get_webview_window("main") else { return };
        let state = handle.state::<AppState>();
        let mut settings = state.settings.lock().unwrap();
        if macos_window::place(&win, settings.display_id.as_deref()) {
            if let Ok(position) = win.outer_position() {
                settings.x = Some(position.x);
                settings.y = Some(position.y);
                save_settings(&settings);
            }
        }
    });
}

#[cfg(not(target_os = "macos"))]
pub fn reset_window_position(app: &AppHandle) {
    mark_geometry_dirty();
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_position(PhysicalPosition::new(900, 500));
    }
}

fn schedule_side_menu_idle_destroy(app: AppHandle) {
    let gen = app
        .state::<AppState>()
        .menu_close_gen
        .fetch_add(1, Ordering::AcqRel)
        + 1;
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(SIDE_MENU_IDLE_DESTROY_SECS));
        let state = app.state::<AppState>();
        if state.menu_open.load(Ordering::Acquire)
            || state.menu_creating.load(Ordering::Acquire)
            || state.menu_close_gen.load(Ordering::Acquire) != gen
        {
            return;
        }
        if let Some(menu_win) = app.get_webview_window("menu") {
            let _ = menu_win.destroy();
        }
    });
}

fn compute_side_menu_pos(
    pet_rect: (i32, i32, i32, i32),
    work_area: (i32, i32, i32, i32),
    menu_size: (i32, i32),
    gap: i32,
    pad: i32,
) -> (i32, i32) {
    let (px, py, pw, ph) = pet_rect;
    let (wx, wy, ww, wh) = work_area;
    let (mw, mh) = menu_size;

    let min_x = wx + pad;
    let max_x = (wx + ww - mw - pad).max(min_x);
    let min_y = wy + pad;
    let max_y = (wy + wh - mh - pad).max(min_y);

    let space_left = (px - gap) - min_x;
    let space_right = (wx + ww - pad) - (px + pw + gap);

    if space_left >= mw {
        return ((px - mw - gap).clamp(min_x, max_x), (py + ph - mh).clamp(min_y, max_y));
    }
    if space_right >= mw {
        return ((px + pw + gap).clamp(min_x, max_x), (py + ph - mh).clamp(min_y, max_y));
    }
    let space_above = (py - gap) - min_y;
    if space_above >= mh {
        return ((px + (pw - mw) / 2).clamp(min_x, max_x), (py - mh - gap).clamp(min_y, max_y));
    }
    let mx = if space_left >= space_right { min_x } else { max_x };
    (mx, (py + ph - mh).clamp(min_y, max_y))
}

fn side_menu_geometry(app: &AppHandle) -> Option<(i32, i32, f64, f64)> {
    let main_win = app.get_webview_window("main")?;
    let sf = main_win.scale_factor().unwrap_or(1.0);
    let p = main_win.outer_position().ok()?;
    let sz = main_win.outer_size().ok()?;
    let pet_rect = (p.x, p.y, sz.width as i32, sz.height as i32);

    let monitor = main_win
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| main_win.primary_monitor().ok().flatten());
    let work_area = if let Some(mon) = monitor {
        let mp = mon.position();
        let ms = mon.size();
        let dock = (46.0 * sf).round() as i32;
        (mp.x, mp.y, ms.width as i32, (ms.height as i32 - dock).max(320))
    } else {
        (0, 0, (1920.0 * sf).round() as i32, (1030.0 * sf).round() as i32)
    };

    let mon_log_h = work_area.3 as f64 / sf.max(0.5);
    let menu_log_h = (mon_log_h - 24.0).clamp(240.0, SIDE_MENU_LOGICAL_H);
    let mw = (SIDE_MENU_LOGICAL_W * sf).round() as i32;
    let mh = (menu_log_h * sf).round() as i32;
    let gap = (10.0 * sf).round() as i32;
    let pad = (10.0 * sf).round() as i32;
    let (mx, my) = compute_side_menu_pos(pet_rect, work_area, (mw, mh), gap, pad);
    Some((mx, my, SIDE_MENU_LOGICAL_W, menu_log_h))
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> AppSettings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn update_settings(app: AppHandle, state: State<'_, AppState>, mut patch: AppSettings) -> AppSettings {
    patch.scale = patch.scale.clamp(0.35, 1.40);
    patch.fps_cap = normalize_fps_cap(patch.fps_cap);
    patch.outfit_id = normalize_outfit_id(&patch.outfit_id);

    let (prev_scale, prev_outfit, prev_harness) = {
        let s = state.settings.lock().unwrap();
        (s.scale, s.outfit_id.clone(), s.harness_on)
    };

    let size_changed = (patch.scale - prev_scale).abs() > 0.005;
    if size_changed {
        if let Some(win) = app.get_webview_window("main") {
            if let Some((nx, ny)) = resize_window_anchored_bottom_right(&win, patch.scale) {
                patch.x = Some(nx);
                patch.y = Some(ny);
            }
        }
    }

    {
        let mut s = state.settings.lock().unwrap();
        #[cfg(target_os = "macos")]
        {
            patch.display_id = s.display_id.clone();
            if patch.display_id.is_some() || !size_changed {
                patch.x = s.x;
                patch.y = s.y;
            }
        }
        *s = patch.clone();
        save_settings(&s);
    }

    let _ = app.emit("kuro-settings", patch.clone());
    if patch.outfit_id != prev_outfit || patch.harness_on != prev_harness {
        tray::refresh_tray(&app);
    }
    if size_changed {
        mark_geometry_dirty();
    }
    patch
}

#[tauri::command]
fn list_custom_accessories() -> Vec<accessories::CustomAccessoryMeta> {
    accessories::list_custom_accessories()
}

#[tauri::command]
fn load_custom_accessory_image(id: String) -> Option<String> {
    accessories::load_custom_accessory_image(&id)
}

#[tauri::command]
fn open_accessories_folder() -> Result<String, String> {
    accessories::open_accessories_folder()
}

#[tauri::command]
async fn open_context_menu(app: AppHandle) -> Result<(), String> {
    let Some((mx, my, lw, lh)) = side_menu_geometry(&app) else {
        return Err("side_menu_geometry returned None".into());
    };

    struct ResetFlag(Arc<AtomicBool>);
    impl Drop for ResetFlag {
        fn drop(&mut self) {
            self.0.store(false, Ordering::Release);
        }
    }

    app.state::<AppState>().menu_close_gen.fetch_add(1, Ordering::AcqRel);

    let menu_win = if let Some(existing) = app.get_webview_window("menu") {
        existing
    } else {
        let creating_flag = app.state::<AppState>().menu_creating.clone();
        if creating_flag
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return Ok(());
        }
        let _guard = ResetFlag(creating_flag);

        if let Some(existing) = app.get_webview_window("menu") {
            existing
        } else {
            let created = tauri::WebviewWindowBuilder::new(
                &app,
                "menu",
                tauri::WebviewUrl::App("menu.html".into()),
            )
            .title("Latte Menu")
            .inner_size(lw, lh)
            .decorations(false)
            .resizable(false)
            .transparent(true)
            .shadow(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(false)
            .build()
            .map_err(|e| e.to_string())?;

            let app_ev = app.clone();
            created.on_window_event(move |event| match event {
                tauri::WindowEvent::Focused(false) => {
                    let state = app_ev.state::<AppState>();
                    if state.menu_opened_at.lock().unwrap().elapsed() >= Duration::from_millis(320) {
                        if let Some(w) = app_ev.get_webview_window("menu") {
                            let _ = w.hide();
                        }
                        state.menu_open.store(false, Ordering::Relaxed);
                        schedule_side_menu_idle_destroy(app_ev.clone());
                    }
                }
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    api.prevent_close();
                    if let Some(w) = app_ev.get_webview_window("menu") {
                        let _ = w.hide();
                    }
                    app_ev.state::<AppState>().menu_open.store(false, Ordering::Relaxed);
                    schedule_side_menu_idle_destroy(app_ev.clone());
                }
                _ => {}
            });
            created
        }
    };

    let state = app.state::<AppState>();
    *state.menu_opened_at.lock().unwrap() = Instant::now();
    state.menu_open.store(true, Ordering::Relaxed);

    let _ = menu_win.set_size(Size::Logical(LogicalSize::new(lw, lh)));
    let _ = menu_win.set_position(PhysicalPosition::new(mx, my));
    let _ = menu_win.set_always_on_top(true);
    let _ = menu_win.show();
    let _ = menu_win.set_focus();
    let _ = app.emit("kuro-menu-opened", ());
    Ok(())
}

#[tauri::command]
fn close_context_menu(app: AppHandle) {
    if let Some(menu_win) = app.get_webview_window("menu") {
        let _ = menu_win.hide();
    }
    app.state::<AppState>().menu_open.store(false, Ordering::Relaxed);
    schedule_side_menu_idle_destroy(app);
}

#[tauri::command]
fn set_dragging(state: State<'_, AppState>, dragging: bool) {
    state.dragging.store(dragging, Ordering::Relaxed);
}

#[tauri::command]
fn save_window_pos(app: AppHandle) {
    mark_geometry_dirty();
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        let Some(win) = handle.get_webview_window("main") else { return };
        let Ok(position) = win.outer_position() else { return };
        let state = handle.state::<AppState>();
        let mut settings = state.settings.lock().unwrap();
        #[cfg(target_os = "macos")]
        if settings
            .display_id
            .as_deref()
            .is_some_and(|id| !macos_window::is_at_display_corner(&win, id))
        {
            settings.display_id = None;
        }
        settings.x = Some(position.x);
        settings.y = Some(position.y);
        save_settings(&settings);
    });
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[cfg(target_os = "macos")]
fn get_cursor_pos(scale_factor: f64) -> Option<(i32, i32)> {
    input_hook::macos_hook::cursor_pos_points().map(|(x, y)| {
        ((x * scale_factor).round() as i32, (y * scale_factor).round() as i32)
    })
}

#[cfg(not(target_os = "macos"))]
fn get_cursor_pos(_scale_factor: f64) -> Option<(i32, i32)> {
    None
}

fn is_over_interactive_silhouette(rx: f64, ry: f64) -> (bool, bool) {
    let dx_cat = (rx - 0.48) / 0.25;
    let dy_cat = (ry - 0.49) / 0.27;
    let over_cat = (dx_cat * dx_cat + dy_cat * dy_cat) <= 1.0;
    let over_desk = (0.06..=0.92).contains(&rx) && (0.65..=0.91).contains(&ry);
    (over_cat || over_desk, over_cat)
}

fn start_hit_test_loop(app: AppHandle, menu_open: Arc<AtomicBool>, dragging: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut last_ignore: Option<bool> = None;
        let mut last_cursor: (i32, i32) = (i32::MIN, i32::MIN);
        let mut last_over_cat = false;
        let mut last_inside = false;
        let mut last_emit = Instant::now() - Duration::from_secs(1);
        let mut sleep_ms: u64 = 40;
        let mut stationary_ticks: u32 = 0;
        let mut cached_visible = true;
        let mut cached_sf = 1.0;
        let mut cached_rect: Option<(i32, i32, f64, f64)> = None;
        let mut last_geom_refresh = Instant::now() - Duration::from_secs(2);

        loop {
            std::thread::sleep(Duration::from_millis(sleep_ms));
            let Some(win) = app.get_webview_window("main") else {
                sleep_ms = 220;
                continue;
            };

            let is_drag = dragging.load(Ordering::Relaxed);
            let geom_dirty = GEOMETRY_DIRTY.swap(false, Ordering::Relaxed);
            if is_drag
                || geom_dirty
                || cached_rect.is_none()
                || last_geom_refresh.elapsed() >= Duration::from_millis(500)
            {
                last_geom_refresh = Instant::now();
                cached_visible = win.is_visible().unwrap_or(false);
                if !cached_visible {
                    sleep_ms = 220;
                    continue;
                }
                cached_sf = win.scale_factor().unwrap_or(1.0);
                if let (Ok(pos), Ok(size)) = (win.outer_position(), win.outer_size()) {
                    cached_rect = Some((pos.x, pos.y, size.width.max(1) as f64, size.height.max(1) as f64));
                }
            } else if !cached_visible {
                sleep_ms = 220;
                continue;
            }

            let Some((win_x, win_y, w, h)) = cached_rect else {
                sleep_ms = 120;
                continue;
            };
            let Some((cx, cy)) = get_cursor_pos(cached_sf) else {
                continue;
            };

            let rx = (cx - win_x) as f64 / w;
            let ry = (cy - win_y) as f64 / h;
            let inside = (0.0..=1.0).contains(&rx) && (0.0..=1.0).contains(&ry);
            let (over_interactive, over_cat) = if inside {
                is_over_interactive_silhouette(rx, ry)
            } else {
                (false, false)
            };

            let should_ignore = !is_drag && !over_interactive;
            if last_ignore != Some(should_ignore) {
                let _ = win.set_ignore_cursor_events(should_ignore);
                last_ignore = Some(should_ignore);
            }

            let state_changed = over_cat != last_over_cat || inside != last_inside;
            let cursor_moved = last_cursor.0 == i32::MIN
                || (cx - last_cursor.0).abs() > 1
                || (cy - last_cursor.1).abs() > 1;
            if cursor_moved || state_changed {
                stationary_ticks = 0;
            } else {
                stationary_ticks = stationary_ticks.saturating_add(1);
            }

            let min_emit_gap = if inside { Duration::from_millis(30) } else { Duration::from_millis(50) };
            if state_changed || (cursor_moved && last_emit.elapsed() >= min_emit_gap) {
                last_cursor = (cx, cy);
                last_over_cat = over_cat;
                last_inside = inside;
                last_emit = Instant::now();
                let _ = app.emit(
                    "kuro-cursor",
                    WindowCursorInfo {
                        rel_x: rx,
                        rel_y: ry,
                        inside_window: inside,
                        over_cat,
                    },
                );
            }

            let near = (-0.15..=1.15).contains(&rx) && (-0.15..=1.15).contains(&ry);
            sleep_ms = if is_drag || menu_open.load(Ordering::Relaxed) || inside {
                25
            } else if near {
                60
            } else if stationary_ticks >= 4 {
                220
            } else {
                100
            };
        }
    });
}

fn file_mtime(path: &std::path::Path) -> Option<SystemTime> {
    std::fs::metadata(path).ok().and_then(|m| m.modified().ok())
}

fn start_accessories_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let dir = accessories::accessories_dir();
        let mut last_m = file_mtime(&dir);
        loop {
            std::thread::sleep(Duration::from_millis(2000));
            let cur = file_mtime(&dir);
            if cur != last_m {
                last_m = cur;
                let _ = app.emit("kuro-accessories", accessories::list_custom_accessories());
                tray::refresh_tray(&app);
            }
        }
    });
}

pub fn run() {
    let initial_settings = load_settings();
    let settings_arc = Arc::new(Mutex::new(initial_settings));
    let menu_open = Arc::new(AtomicBool::new(false));
    let dragging = Arc::new(AtomicBool::new(false));
    let paused_guard = Arc::new(AtomicBool::new(false));

    let settings_for_setup = settings_arc.clone();
    let menu_for_setup = menu_open.clone();
    let drag_for_setup = dragging.clone();
    let paused_for_setup = paused_guard.clone();

    tauri::Builder::default()
        .manage(AppState {
            settings: settings_arc,
            menu_open,
            menu_creating: Arc::new(AtomicBool::new(false)),
            menu_close_gen: Arc::new(AtomicU64::new(0)),
            menu_opened_at: Arc::new(Mutex::new(Instant::now() - Duration::from_secs(10))),
            dragging,
            paused_guard,
        })
        .setup(move |app| {
            let handle = app.handle().clone();
            let s = settings_for_setup.lock().unwrap().clone();

            #[cfg(target_os = "macos")]
            {
                let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            }

            if let Some(win) = app.get_webview_window("main") {
                let (win_w, win_h) = window_dimensions(s.scale);
                let _ = win.set_size(Size::Logical(LogicalSize::new(win_w, win_h)));
                #[cfg(target_os = "macos")]
                {
                    macos_window::configure_fullscreen(&win, true);
                    match (s.display_id.as_deref(), s.x, s.y) {
                        (None, Some(x), Some(y)) => {
                            let _ = win.set_position(PhysicalPosition::new(x, y));
                        }
                        (preferred, _, _) => {
                            macos_window::place(&win, preferred);
                        }
                    }
                }
            }

            tray::setup_tray(&handle, &s)?;
            input_hook::start_global_hooks(handle.clone());
            privacy::start_password_privacy_watcher(
                handle.clone(),
                settings_for_setup,
                paused_for_setup,
            );
            start_hit_test_loop(handle.clone(), menu_for_setup, drag_for_setup);
            start_accessories_watcher(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            update_settings,
            list_custom_accessories,
            load_custom_accessory_image,
            open_accessories_folder,
            open_context_menu,
            close_context_menu,
            set_dragging,
            save_window_pos,
            quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LatteCat");
}
