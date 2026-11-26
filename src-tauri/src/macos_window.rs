use std::ptr::NonNull;

use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSNormalWindowLevel, NSScreen, NSStatusWindowLevel, NSWindow,
    NSWindowCollectionBehavior as Behavior,
};
use objc2_core_foundation::{CFRetained, CFUUID};
use objc2_foundation::{NSNumber, NSPoint, NSRect, NSSize, NSString};
use tauri::{Manager, WebviewWindow};

use crate::AppState;

#[link(name = "ColorSync", kind = "framework")]
extern "C" {
    fn CGDisplayCreateUUIDFromDisplayID(display: u32) -> Option<NonNull<CFUUID>>;
}

struct Display {
    id: String,
    visible_frame: NSRect,
}

fn displays(mtm: MainThreadMarker) -> Vec<Display> {
    NSScreen::screens(mtm)
        .iter()
        .filter_map(|screen| {
            let number = screen
                .deviceDescription()
                .objectForKey(&NSString::from_str("NSScreenNumber"))?
                .downcast::<NSNumber>()
                .ok()?
                .unsignedIntValue();
            let id = unsafe { CGDisplayCreateUUIDFromDisplayID(number) }
                .map(|uuid| unsafe { CFRetained::from_raw(uuid) })
                .and_then(|uuid| CFUUID::new_string(None, Some(&uuid)))
                .map(|uuid| uuid.to_string())
                .unwrap_or_else(|| number.to_string());
            Some(Display {
                id,
                visible_frame: screen.visibleFrame(),
            })
        })
        .collect()
}

fn target_display<'a>(displays: &'a [Display], preferred: Option<&str>) -> Option<&'a Display> {
    preferred
        .and_then(|id| displays.iter().find(|display| display.id == id))
        .or_else(|| displays.first())
}

fn with_native_window<T>(
    window: &WebviewWindow,
    action: impl FnOnce(MainThreadMarker, &NSWindow) -> T,
) -> Option<T> {
    let mtm = MainThreadMarker::new()?;
    let native = window.ns_window().ok()?.cast::<NSWindow>();
    let native = unsafe { native.as_ref()? };
    Some(action(mtm, native))
}

fn bottom_right_frame(visible: NSRect, size: NSSize) -> NSRect {
    const RIGHT_MARGIN: f64 = 24.0;
    const BOTTOM_MARGIN: f64 = 16.0;
    NSRect::new(
        NSPoint::new(
            (visible.origin.x + visible.size.width - size.width - RIGHT_MARGIN)
                .max(visible.origin.x),
            visible.origin.y + BOTTOM_MARGIN,
        ),
        size,
    )
}

pub fn place(window: &WebviewWindow, preferred: Option<&str>) -> bool {
    with_native_window(window, |mtm, native| {
        let connected = displays(mtm);
        let Some(display) = target_display(&connected, preferred) else {
            return false;
        };
        native
            .setFrameOrigin(bottom_right_frame(display.visible_frame, native.frame().size).origin);
        true
    })
    .unwrap_or(false)
}

pub fn resize_pinned(window: &WebviewWindow, width: f64, height: f64) {
    let window = window.clone();
    let _ = window.clone().run_on_main_thread(move || {
        let preferred = window
            .state::<AppState>()
            .settings
            .lock()
            .unwrap()
            .display_id
            .clone();
        let _ = with_native_window(&window, |mtm, native| {
            let size = NSSize::new(width, height);
            let mut frame = native.frame();
            let connected = displays(mtm);
            if let Some(display) = preferred
                .as_deref()
                .and_then(|id| target_display(&connected, Some(id)))
            {
                frame = bottom_right_frame(display.visible_frame, size);
            } else {
                frame.origin.x += frame.size.width - size.width;
                frame.size = size;
            }
            native.setFrame_display(frame, true);
        });
    });
}

pub fn is_at_display_corner(window: &WebviewWindow, preferred: &str) -> bool {
    with_native_window(window, |mtm, native| {
        let connected = displays(mtm);
        let Some(display) = target_display(&connected, Some(preferred)) else {
            return true;
        };
        let frame = native.frame();
        let expected = bottom_right_frame(display.visible_frame, frame.size).origin;
        (frame.origin.x - expected.x).abs() <= 1.0 && (frame.origin.y - expected.y).abs() <= 1.0
    })
    .unwrap_or(true)
}

pub fn configure_fullscreen(window: &WebviewWindow, always_on_top: bool) {
    let window = window.clone();
    let _ = window.clone().run_on_main_thread(move || {
        let _ = with_native_window(&window, |_, native| {
            let mut behavior = native.collectionBehavior();
            behavior.remove(Behavior::MoveToActiveSpace | Behavior::Managed | Behavior::Transient);
            behavior.insert(Behavior::CanJoinAllSpaces | Behavior::Stationary);
            behavior.remove(
                Behavior::FullScreenPrimary
                    | Behavior::FullScreenAuxiliary
                    | Behavior::FullScreenNone,
            );

            if objc2::available!(macos = 13.0) {
                behavior.remove(Behavior::Primary | Behavior::Auxiliary);
                behavior.insert(Behavior::CanJoinAllApplications);
            } else {
                behavior.insert(Behavior::FullScreenAuxiliary);
            }

            native.setCollectionBehavior(behavior);
            native.setLevel(if always_on_top {
                NSStatusWindowLevel
            } else {
                NSNormalWindowLevel
            });
        });
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn corners_use_global_appkit_coordinates() {
        let visible = NSRect::new(NSPoint::new(-2304.0, 120.0), NSSize::new(2304.0, 1250.0));
        let frame = bottom_right_frame(visible, NSSize::new(286.0, 299.0));
        assert_eq!(frame.origin, NSPoint::new(-310.0, 136.0));
    }

    #[test]
    fn disconnected_preference_falls_back_to_primary() {
        let screen = |id: &str| Display {
            id: id.to_owned(),
            visible_frame: NSRect::default(),
        };
        let connected = [screen("main"), screen("external")];
        assert_eq!(
            target_display(&connected, Some("external")).unwrap().id,
            "external"
        );
        assert_eq!(
            target_display(&connected, Some("absent")).unwrap().id,
            "main"
        );
    }
}
