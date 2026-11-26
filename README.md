# 拿铁桌宠 (Latte Desktop Pet for macOS)

专为纯正银虎斑美短小猫 **拿铁 (Latte)** 定制的超轻量 macOS 桌面宠物：彩铅手绘分层贴图 + 实时精准按压键帽/鼠标 + 极简菜单，全包仅 **~4.9 MB**，零后台端口、零遥测。

---

## 给 AI Agent 的一键安装指南（换新 Mac 直接复制即可）

> **如果你换了一台新 Mac，直接把下面这句话发给你的 AI Agent（Antigravity / Claude Code / Codex 等）：**
>
> `帮我从 https://github.com/ZhengtongDu/latte-desktop-pet 安装拿铁桌宠到 /Applications/KuroCat.app，按仓库 README.md 的 Agent 安装流程执行并帮我打开 macOS 隐私权限设置页。`

### Agent 标准化执行步骤（Strict Runbook）

请按以下顺序在 macOS 终端执行：

#### 第 1 步：拉取仓库（公开仓库，无需登录 GitHub）

```bash
if [ -d "$HOME/latte-desktop-pet/.git" ]; then
  git -C "$HOME/latte-desktop-pet" pull --ff-only
else
  git clone https://github.com/ZhengtongDu/latte-desktop-pet.git "$HOME/latte-desktop-pet"
fi
```

#### 第 2 步：运行一键安装脚本

```bash
cd "$HOME/latte-desktop-pet"
chmod +x install.sh
./install.sh --open-privacy
```

`install.sh` 会自动完成以下全部工作：
1. **Apple Silicon (`arm64`) 极速路径（~3 秒，无需安装 Node/Rust/gh）**：自动用 `curl` 直接从 GitHub Latest Release 下载预编译的 `KuroCat-macOS-arm64.zip`，用 `ditto` 解压安装到 `/Applications/KuroCat.app`。
2. **Intel Mac (`x86_64`) 或强制源码构建路径**：若不是 `arm64`、未下载到预编译包，或传入 `./install.sh --from-source`，则自动执行 `npm ci && npx tauri build --bundles app` 本地编译并安装到 `/Applications/KuroCat.app`。
   - 如果本地源码构建缺少环境，请先安装：
     - Xcode Command Line Tools: `xcode-select --install`
     - Node.js (≥ 18): `brew install node`
     - Rust toolchain: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y`
3. **移除 macOS 隔离属性**：自动执行 `xattr -dr com.apple.quarantine /Applications/KuroCat.app`（避免“已损坏 / 无法验证开发者”弹窗）。
4. **初始化默认配置**：若新 Mac 上尚无 `~/Library/Application Support/kuro-cat-pet/settings.json`，自动写入默认 `68%` 紧凑尺寸配置。
5. **启动应用并打开权限设置**：启动 `/Applications/KuroCat.app`，并在 `--open-privacy` 时打开系统设置隐私面板。

#### 第 3 步：引导用户手动勾选 2 项 macOS 隐私权限（不可跳过）

macOS 的 TCC 安全机制不允许命令行替用户授权，请**提示用户手动完成以下两处勾选**：

1. **系统设置 → 隐私与安全性 → 辅助功能 (Accessibility)** → 开启 **`KuroCat`**
2. **系统设置 → 隐私与安全性 → 输入监控 (Input Monitoring)** → 开启 **`KuroCat`**

（如需单独用命令唤起对应面板：）
```bash
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
open "x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent"
```

勾选完成后，让用户点击顶部菜单栏小猫图标 → **「键盘权限 → 重新连接」**（或退出重开 `/Applications/KuroCat.app`），敲键盘确认拿铁的前爪开始实时按压对应键帽即可验收通过！

#### 第 4 步（可选）：设置开机自启动

如果用户希望开机自动打开拿铁，可执行：
```bash
osascript -e 'tell application "System Events" to make login item at end with properties {path:"/Applications/KuroCat.app", hidden:false}'
```

---

## 手动安装（不用命令行）

1. 在本仓库右侧 **Releases** 页面下载最新的 `KuroCat-macOS-arm64.dmg`（Apple Silicon Mac）。
2. 双击打开 DMG，把 `KuroCat.app` 拖进 `Applications` 文件夹。
3. 首次启动如果提示无法验证开发者，在终端运行一次：
   ```bash
   xattr -dr com.apple.quarantine /Applications/KuroCat.app
   ```
4. 打开 `/Applications/KuroCat.app`，在 **系统设置 → 隐私与安全性** 中为 `KuroCat` 开启 **辅助功能** 和 **输入监控**。

---

## 功能特色

- **纯正银虎斑彩铅手绘**：纯白银虎斑毛色 + 6 套表情（待机、眨眼、积极吐舌打字、开心笑眼、睡觉、被吵醒犯困），打字再快也保持积极开心表情 + 彩色音符与按键火花。
- **逐键精准按压 & 鼠标点击**：6 套方向前爪差分图 + 实时肩部微调瞄准 + 轻微身体前倾，前爪会精准按在 65% RGB 机械键盘的每个键帽及左侧电竞鼠标左右键上。
- **极简右键菜单 & 托盘控制**：
  - 右键点小猫：配饰（无 / 甜甜圈 / 铃铛项圈 / 自定义 PNG / 胸背带）、省电帧率（流畅 60 / 均衡 30 / 省电 20）、输密码时自动捂眼、退出。
  - 顶部菜单栏托盘：大小调节（小 55% / 中 68% 默认 / 大 85%）、显示器切换、一键重置位置、键盘权限诊断与重连。
- **轻量省电**：纯 2D Canvas 缓存绘制（无 Three.js / WebGL）、空闲自动降到 10 FPS、睡着降到 5 FPS，无任何后台 HTTP 服务或网络请求。

---

## 本地开发与美术更新

```bash
# 前端开发预览（浏览器里支持 ?demo=keys:enter,esc / ?demo=mouse / ?demo=happy / ?demo=sleep）
npm run dev

# 修改 art/latte-pencil/*.png 后，一键重新调纯白银虎斑并导出全部 webp 贴图
python3 scripts/export-silver-sprites.py

# 运行 Rust 单元测试
(cd src-tauri && cargo test)

# 打包发布版 macOS .app
npx tauri build --bundles app
```

---

## 致谢与许可

本项目基于 [qianyiai/kurocat](https://github.com/qianyiai/kurocat)（MIT License）深度精简与二次定制。原许可保留在 [LICENSE](./LICENSE)。
