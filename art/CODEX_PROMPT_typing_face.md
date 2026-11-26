# 给 Codex 的小任务：拿铁「打字中」表情重画

> 复制「---」之间的内容给 Codex。

---

请重画拿铁桌宠的「打字中」表情。现有的 `body_typing.png` 半眯眼、看起来像在生气，我希望打字时拿铁是**积极、投入、有点兴奋**的样子。

## 参考文件

- 底图（必须基于它修改）：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/body_idle.png`
- 被摸头时的开心表情（风格参考）：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/body_happy.png`
- 图层规格说明：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/manifest.json`

## 要画什么

文件 `body_typing.png`，表情要求：
- 眼睛**睁圆、明亮**，瞳孔稍微放大，眼神有光（专注又兴奋）
- 嘴角**微微上扬**，可以露出一点点舌尖（调皮，不是嫌弃）
- 耳朵**竖起、略微前倾**（感兴趣）
- 整体气质：像发现了好玩的东西、正在认真玩键盘，**不要**半眯眼、皱眉、撇嘴

## 规格（和第二阶段完全相同）

- 1024 × 1024，PNG，透明背景
- 彩铅画风，和 `body_idle.png` 一致
- **只改头部**（脸 + 耳朵）。做法：生成后用柔边蒙版只把头部区域贴回 `body_idle.png`，保证脖子以下像素和 idle **完全一致**
- 不画前臂/前爪、尾巴、配饰、键盘

## 存储位置

直接覆盖：`/Users/duzhengtong/.gemini/antigravity/scratch/kurocat/art/latte-pencil/body_typing.png`
覆盖前先把旧文件改名为 `body_typing_old.png` 备份。

## 自查

- [ ] 叠上 `acc_donut.png`、`acc_bell_collar.png` 后不穿帮
- [ ] 和 `body_idle.png` 来回切换时，脖子以下纹丝不动
- [ ] 一眼看上去是开心/投入，不是生气或嫌弃

---
