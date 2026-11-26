#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Latte Desktop Pet (拿铁桌宠) — One-Command macOS Installer
# Supports fast prebuilt install from GitHub Release (Apple Silicon) with
# automatic fallback to building from source (Apple Silicon & Intel).
# ==============================================================================

REPO="ZhengtongDu/latte-desktop-pet"
APP_NAME="KuroCat.app"
INSTALL_DIR="/Applications"
DEST_APP="${INSTALL_DIR}/${APP_NAME}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

FROM_SOURCE=0
NO_LAUNCH=0
OPEN_SETTINGS=0

for arg in "$@"; do
  case "$arg" in
    --from-source) FROM_SOURCE=1 ;;
    --no-launch) NO_LAUNCH=1 ;;
    --open-privacy) OPEN_SETTINGS=1 ;;
    -h|--help)
      cat <<'USAGE'
Usage: ./install.sh [OPTIONS]

Options:
  --from-source   Always compile locally from source (requires Node.js + Rust)
  --no-launch     Install to /Applications without launching immediately
  --open-privacy  Open macOS Accessibility & Input Monitoring settings after install
  -h, --help      Show this help message
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: Latte Desktop Pet is macOS-only." >&2
  exit 1
fi

ARCH="$(uname -m)"
echo "==> Detected macOS (${ARCH})"

# Stop any running instance first
pkill -x KuroCat 2>/dev/null || true
sleep 0.4

install_app_bundle() {
  local src_app="$1"
  if [[ ! -d "$src_app" ]]; then
    echo "Error: App bundle not found at ${src_app}" >&2
    exit 1
  fi
  echo "==> Installing ${APP_NAME} -> ${DEST_APP}"
  rm -rf "$DEST_APP"
  ditto "$src_app" "$DEST_APP"
  xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true
}

INSTALLED=0

# Fast path: prebuilt Apple Silicon bundle from GitHub Release
if [[ "$FROM_SOURCE" -eq 0 && "$ARCH" == "arm64" ]] && command -v gh >/dev/null 2>&1; then
  if gh auth status >/dev/null 2>&1; then
    TMP_DIR="$(mktemp -d)"
    trap 'rm -rf "$TMP_DIR"' EXIT
    echo "==> Downloading prebuilt macOS arm64 bundle from GitHub Release (${REPO})..."
    if gh release download --repo "$REPO" --pattern "KuroCat-macOS-arm64.zip" --dir "$TMP_DIR" 2>/dev/null; then
      ditto -x -k "${TMP_DIR}/KuroCat-macOS-arm64.zip" "$TMP_DIR"
      if [[ -d "${TMP_DIR}/${APP_NAME}" ]]; then
        install_app_bundle "${TMP_DIR}/${APP_NAME}"
        INSTALLED=1
      fi
    else
      echo "    (No prebuilt arm64 release asset downloaded; falling back to local source build)"
    fi
  fi
fi

# Fallback / explicit path: compile cleanly from source
if [[ "$INSTALLED" -eq 0 ]]; then
  echo "==> Building from source in ${SCRIPT_DIR}..."
  export PATH="$HOME/.cargo/bin:$PATH"

  if ! command -v npm >/dev/null 2>&1; then
    echo "Error: Node.js / npm not found. Install via: brew install node" >&2
    exit 1
  fi
  if ! command -v cargo >/dev/null 2>&1; then
    echo "Error: Rust / cargo not found. Install via: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y" >&2
    exit 1
  fi

  cd "$SCRIPT_DIR"
  npm ci
  npx tauri build --bundles app
  install_app_bundle "${SCRIPT_DIR}/src-tauri/target/release/bundle/macos/${APP_NAME}"
fi

# Seed compact 68% default config if this Mac has never run Latte before
SETTINGS_DIR="$HOME/Library/Application Support/kuro-cat-pet"
SETTINGS_FILE="${SETTINGS_DIR}/settings.json"
if [[ ! -f "$SETTINGS_FILE" ]]; then
  mkdir -p "$SETTINGS_DIR"
  cat <<'JSON' > "$SETTINGS_FILE"
{
  "x": null,
  "y": null,
  "scale": 0.68,
  "privacyPasswordGuard": true,
  "fpsCap": 30,
  "outfitId": "donut-yellow",
  "harnessOn": false
}
JSON
  echo "==> Created default settings at ${SETTINGS_FILE}"
fi

if [[ "$NO_LAUNCH" -eq 0 ]]; then
  echo "==> Launching ${DEST_APP}..."
  open "$DEST_APP"
fi

if [[ "$OPEN_SETTINGS" -eq 1 ]]; then
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility" || true
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent" || true
fi

cat <<'DONE'

========================================================================
  拿铁桌宠安装完成！已安装到 /Applications/KuroCat.app
========================================================================
【重要】首次在新 Mac 上使用键盘/鼠标同步，需要手动开启两项 macOS 隐私权限：
  1. 系统设置 → 隐私与安全性 → 辅助功能 (Accessibility) → 勾选 KuroCat
  2. 系统设置 → 隐私与安全性 → 输入监控 (Input Monitoring) → 勾选 KuroCat

快速打开设置面板命令：
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
  open "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"

开启权限后，若按键未立即生效，点顶部菜单栏小猫图标 →「键盘权限 → 重新连接」或重启应用即可。
DONE
