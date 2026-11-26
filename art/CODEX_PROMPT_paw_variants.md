# 给 Codex 的任务：拿铁「按键盘 / 鼠标」前爪 6 张方向差分图

> 复制下方「---」之间的内容直接发给 Codex。

---

请为拿铁（银渐层/银虎斑美短小猫）桌宠补画 **6 张前爪按压方向差分图**，让拿铁敲键盘不同区域（以及点左侧鼠标）时，前爪能自然伸展并真正按到对应按键上。

## 参考文件（必须严格对齐画风、毛色和 1024×1024 坐标系）

- 身体底图（用来对齐肩部融合位置）：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/body_idle.png`
- 现有画面左侧前爪参考（肩根中心约 `(413, 635)`）：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/paw_left_down.png`
- 现有画面右侧前爪参考（肩根中心约 `(603, 635)`）：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/paw_right_down.png`
- 现有图层配置：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/manifest.json`

## 方向命名约定（务必按画面视角，不要搞反）

- `paw_left_*` = **画面左侧**的那只前爪（和现有 `paw_left_down.png` 同侧，肩根中心 `(413, 635)`）
- `paw_right_*` = **画面右侧**的那只前爪（和现有 `paw_right_down.png` 同侧，肩根中心 `(603, 635)`）
- **不要改动或覆盖**现有的 `paw_left_down.png`、`paw_left_up.png`、`paw_right_down.png`、`paw_right_up.png`（静置、抬爪和捂眼仍会用到它们）。

## 需要新增的 6 张透明 PNG（全部 1024×1024）

每一张图**只画单只前臂 + 前爪**（不画身体、不画键盘、不画鼠标、不画阴影背景），并且要像真实小猫伸爪按按键一样有自然弯曲和手腕角度（**不要**简单把原图硬旋转拉长）：

### 画面左侧前爪（肩根锚点都在 `(413, 635)` 附近）
1. **`paw_left_press_far.png`**（向左外侧伸展按压：按鼠标、方向键、回车、退格）
   - 从左肩 `(413, 635)` 自然向**画面左下方斜伸**（约 `-36°`），前臂顺滑带一点弧度，手腕微弯，爪尖自然朝下平压
   - 爪尖按压落点中心约在 **`(215, 910)`**（留足边距，不要裁出 1024 画布）
2. **`paw_left_press_mid.png`**（向正下方略微前探按压：按中后排按键如 `P/O/I/K/L/8/9/0`）
   - 从左肩 `(413, 635)` 向正下方略偏左前伸，比静置 `paw_left_down.png` 更有“向前伸直按下去”的透视感，脚趾略微舒展下压
   - 爪尖按压落点中心约在 **`(385, 945)`**
3. **`paw_left_press_in.png`**（向画面中线偏右内收按压：按 `H/J/N/B/空格左侧`）
   - 从左肩 `(413, 635)` 自然向**画面右下方斜伸**（约 `+18°`），手腕微扣、爪尖朝下平压
   - 爪尖按压落点中心约在 **`(510, 930)`**

### 画面右侧前爪（肩根锚点都在 `(603, 635)` 附近）
4. **`paw_right_press_in.png`**（向画面中线偏左内收按压：按 `G/F/T/R/V/空格右侧`）
   - 从右肩 `(603, 635)` 自然向**画面左下方斜伸**（约 `-18°`），手腕微扣、爪尖朝下平压
   - 爪尖按压落点中心约在 **`(510, 930)`**
5. **`paw_right_press_mid.png`**（向正下方略微前探按压：按中后排按键如 `E/W/D/S/3/4/5`）
   - 从右肩 `(603, 635)` 向正下方略偏右前伸，比静置 `paw_right_down.png` 更向前探出，脚趾微张下压
   - 爪尖按压落点中心约在 **`(645, 945)`**
6. **`paw_right_press_far.png`**（向右外侧伸展按压：按 `Esc/1/Q/A/Z/Tab/Caps/⌘`）
   - 从右肩 `(603, 635)` 自然向**画面右下方斜伸**（约 `+34°`），前臂顺滑斜伸，手腕微弯、爪尖自然朝下平压
   - 爪尖按压落点中心约在 **`(810, 935)`**（留足边距，不要裁出 1024 画布）

## 关键画质与技术规格（非常重要！）

- **统一规格**：`1024 × 1024`，PNG，RGBA 透明背景，背景完全干净无白边/灰雾。
- **画风与毛色完全一致**：细腻彩铅手绘质感，暖银灰白底毛 + 深炭棕虎斑条纹 + 米白小爪趾 + 柔和深棕彩铅勾线；毛发粗细、色调、笔触和 `paw_left_down.png`、`body_idle.png` 无缝衔接。
- **肩根柔边羽化（关键！）**：程序会在代码里以肩根为圆心做 ±12° 以内的微小旋转微调来精准对准每个键帽中心。因此前臂最上端的肩根（约 `y = 605..660`）请做成**圆弧形自然柔边羽化**（顶部和肩部两侧边缘都柔和透明过渡），叠在 `body_idle.png` 胸口上无缝融合，**不要**留出硬切直线，避免小角度旋转时露缝。
- **爪尖朝向自然**：外伸（`far`）和内收（`in`）时，手腕要略微拐回，让猫爪正面/趾尖自然朝向下方的键帽，而不是僵硬的木棍斜插。
- **比例统一**：6 张前臂的粗细、爪掌宽度要与 `paw_left_down.png` / `paw_right_down.png` 保持一致（掌宽约 `105–120 px`），不要忽粗忽细。

## 存储位置与清单更新

1. 6 张 PNG 直接存到：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/`
   - `paw_left_press_far.png`
   - `paw_left_press_mid.png`
   - `paw_left_press_in.png`
   - `paw_right_press_in.png`
   - `paw_right_press_mid.png`
   - `paw_right_press_far.png`
2. 请同步更新 `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/manifest.json`，新增 `pawVariants` 字段，按**实际画出来的像素位置**准确填写每张图的肩根圆心 `shoulder: [x, y]` 和爪尖按压落点 `tip: [x, y]`（供程序精确瞄准每个按键中心）。示例格式：
   ```json
   "pawVariants": {
     "paw_left_press_far":  { "shoulder": [413, 635], "tip": [215, 910] },
     "paw_left_press_mid":  { "shoulder": [413, 635], "tip": [385, 945] },
     "paw_left_press_in":   { "shoulder": [413, 635], "tip": [510, 930] },
     "paw_right_press_in":  { "shoulder": [603, 635], "tip": [510, 930] },
     "paw_right_press_mid": { "shoulder": [603, 635], "tip": [645, 945] },
     "paw_right_press_far": { "shoulder": [603, 635], "tip": [810, 935] }
   }
   ```
3. 请顺手生成一张合图预览 `/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/paw_reach_contact_sheet.png`（2 行 3 列，把 6 张前爪分别叠在 `body_idle.png` 上，并用小红点标出 `shoulder`、小青点标出 `tip`），方便直观验收肩部融合和落点准度。

## 自查清单

- [ ] 6 张图均是 `1024×1024` 透明 PNG，无背景残留，且原有 4 张 `paw_*` 未被改动
- [ ] 每张叠在 `body_idle.png` 上肩部自然衔接，无硬切缝或错位
- [ ] `far / mid / in` 三个角度清晰拉开，爪腕自然弯曲、趾尖朝下按压，不是僵硬旋转复制
- [ ] `manifest.json` 里的 `shoulder` 和 `tip` 坐标与实际图像完全吻合

---
